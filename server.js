// Não alterar o código sem autorização do Desenvolvedor Chefe!

// Arquivos de importação node.js.
import axios from 'axios';
import express from 'express';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
// import { MercadoPagoConfig, Preference } from 'mercadopago';
dotenv.config();

// Configurações do servidor.
const app = express();
const PORT = process.env.PORT || 5500;

// Middleware para parsear application/x-www-form-urlencoded e application/json.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <link rel="icon" type="image/png" href="#">
        <title>Servidor Mr Doce</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color:  #ff5c87;
                text-align: center;
                color: snow;
                padding: 50px;
            }
            #mainContent a {
                border: 2px solid snow;
                display: inline-block;
                color: #140f07;
                background-color: snow;
                padding: 10px 20px;
                text-decoration: none;
                font-weight: bold;
                border-radius: 10px;
                box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.6);
                transition: all 0.3s ease;
                animation-delay: 2s;
                margin-top: 20px;
            }
            #mainContent a:hover {
                background-color:  #ff5c87;
                border-radius: 20px;
                color: snow;
            }
        </style>
    </head>
    <body>
        <div id="mainContent">
            <h1>Servidor Mr. Doce</h1>
            <p>O servidor está online e pronto para receber requisições!</p>
        </div>
    </body>
</html>
    `);
});

app.use((req, res, next) => {
    const allowedOrigins = [
        'https://mrdoce.netlify.app'
    ];

    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// Configurações para envios de dados para adiministrador e cliente.
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.ORDER_EMAIL_USER,
        pass: process.env.ORDER_EMAIL_PASS
    }
});

// Rota para calcular o frete do pedido.
app.post('/calculateFreight', async (req, res) => {
    const { toPostalCode, units } = req.body;
    const allProducts = [
        {
            id: 'ID1',
            width: 20,
            height: 5,
            length: 20,
            weight: 0.2,
            insurance_value: 9.99
        },
        {
            id: 'ID2',
            width: 21,
            height: 5,
            length: 25,
            weight: 0.2,
            insurance_value: 9.99
        },
        {
            id: 'ID3',
            width: 20,
            height: 5,
            length: 20,
            weight: 0.2,
            insurance_value: 9.99
        },
        {
            id: 'ID4',
            width: 20,
            height: 5,
            length: 20,
            weight: 0.2,
            insurance_value: 5.99
        }
    ];

    const filteredProducts = allProducts
        .map(product => ({
            ...product,
            quantity: units[product.id] || 0
        }))
        .filter(product => product.quantity >= 1);

    if (filteredProducts.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Nenhum produto com quantidade válida foi fornecido.'
        });
    }

    const options = {
        method: 'POST',
        url: 'https://melhorenvio.com.br/api/v2/me/shipment/calculate',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.ME_TOKEN}`,
            'User-Agent': 'API Mr. Doce (paulomarianodevgmail.com)'
        },
        data: {
            from: { postal_code: '13422572' },
            to: { postal_code: toPostalCode },
            services: "1,2",
            products: filteredProducts
        }
    };

    try {
        const response = await axios.request(options);
        console.log('Resposta da API:', response.data);
        const correiosData = response.data.filter(service => service.company.name === 'Correios');
        const formattedData = correiosData.length > 0 ? {
            success: true,
            data: correiosData
        } : {
            success: false,
            message: 'Nenhum serviço dos Correios disponível para o trecho.'
        };
        res.json(formattedData);
    } catch (error) {
        console.error('Erro ao calcular frete:', error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({
            success: false,
            error: error.response ? error.response.data : error.message
        });
    }
});

// Rota para enviar o pedido por email e gerar um link de pagamento.
app.post('/sendOrder', async (req, res) => {
    console.log('Requisição recebida em /sendOrder');

    const { firstName, lastName, telephone, cpfCnpj, cep, address, addressComplement, city, state, number, emailLabel, cart, totalAmount, shippingService } = req.body;
    const totalAmountNumber = parseFloat(totalAmount);
    if (isNaN(totalAmountNumber)) {
        return res.status(400).send('Total do pedido inválido.');
    }

    // // Configurações do Mercado Pago.
    // const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    // const client = new MercadoPagoConfig({ accessToken });
    // const preference = new Preference(client);

    // Criar preferência de pagamento.
    try {
        // const response = await preference.create({
        //     body: {
        //         items: [
        //             {
        //                 title: `Pedido de ${firstName} ${lastName}`,
        //                 quantity: 1,
        //                 unit_price: totalAmountNumber,
        //                 currency_id: 'BRL',
        //             }
        //         ],
        //         payer: {
        //             name: `${firstName} ${lastName}`,
        //             email: emailLabel,
        //         },
        //         payment_methods: {
        //             excluded_payment_methods: [],
        //             excluded_payment_types: [],
        //             installments: 12,
        //         },
        //     }
        // });

        // // Obter link de pagamento da preferência criada.
        // const initPoint = response.init_point;

        const emailBodyClient = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="icon" type="image/png" href="#">
        <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f3f3f3;
            line-height: 1.6;
        }
        .container {
            color: #000;
            max-width: 700px;
            margin: 40px auto;
            padding: 25px;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color:  #ff5c87;
            color: #fff;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
            font-size: 26px;
            font-weight: 600;
            box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.1);
        }
        h3 {
            color:   #ff5c87;
            font-size: 22px;
            font-weight: 500;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
        }
        p {
            margin: 8px 0;
            font-size: 16px;
        }
        p strong {
        color:   #ff5c87;
        }
        ul {
            list-style-type: none;
            padding: 0;
            margin: 15px 0;
        }
        li {
            padding: 10px;
            margin-bottom: 10px;
            background-color: snow;
            border: 1px solid #eee;
            border-radius: 8px;
        }
        li strong {
            display: block;
            color:   #ff5c87;
            margin-bottom: 4px;
        }
        hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding: 15px;
            text-align: center;
            font-size: 14px;
            color: #777;
            background-color: snow;
            border-radius: 0 0 8px 8px;
            border-top: 1px solid #ddd;
        }
        .logo {
        color:   #ff5c87;
        }
        a {
        display: inline-block;
        color: #140f07;
        background-color: snow;
        padding: 10px 20px;
        text-decoration: none;
        font-weight: bold;
        border-radius: 0 0 10px 10px;
        box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.6);
        transition: all 0.3s ease;
        }
        a:hover {
        background-color:   #ff5c87;
        color: snow;
        }
        @media (max-width: 600px) {
            .container {
                margin: 20px;
                padding: 20px;
            }
            .header {
                font-size: 24px;
                padding: 15px;
            }
            h3 {
                font-size: 20px;
            }
            p, li {
                font-size: 14px;
            }
        }
    </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                Pedido Recebido!
            </div>
            <p>Olá ${firstName} ${lastName},</p>
            <p>Agradecemos por escolher a Mr. Doce!</p>
            <p>Abaixo estão os detalhes do seu pedido:</p>
            <hr>
            <p><strong>Status:</strong> Aguardando confirmação do pagamento...</p>
            <p><strong>Total do Pedido(Frete incluso):</strong> R$ ${totalAmountNumber.toFixed(2)}</p>
            <p><strong>Serviço de Frete:</strong> ${shippingService.name} - R$ ${shippingService.price.toFixed(2)}</p>
            <p><strong>Endereço para entrega:</strong>
            <br>
            ${address}, ${number} - ${city}/${state}</p>
            ${addressComplement ? `<p><strong>Complemento:</strong> ${addressComplement}</p>` : ''}
            <hr>
            <p><strong>Link para pagamento:</strong>
            <br>
            PROJETO COM FINS EDUCACIONAIS
            <br>
            </p>
            <hr>
            <h3>Produtos no Carrinho:</h3>
            <ul>
                ${cart.map(item => `
                    <li>
                        <strong>Produto:</strong> ${item.name}<br>
                        <strong>Preço:</strong> R$ ${item.price.toFixed(2)}<br>
                        <strong>Quantidade:</strong> ${item.quantity}<br>
                        <strong>Subtotal:</strong> R$ ${item.subtotal.toFixed(2)}
                    </li>
                `).join('')}
            </ul>
            <h3>Tempo de Processamento:</h3>
            <ul>
                <li><strong>PIX:</strong> Processamento em tempo real.</li>
                <li><strong>Crédito:</strong> Até 2 dias úteis para confirmação.</li>
                <li><strong>Boleto:</strong> Até 3 dias úteis para compensação.</li>
                <li><strong>Débito:</strong> Processamento em tempo real.</li>
                <li><strong>Após a confirmação do pagamento o envio será realizado dentro de até 5 dias úteis.</strong></li>
            </ul>
            <div class="footer">
                <p>Agradecemos pela sua confiança em nossos serviços. Estamos à disposição para qualquer necessidade e esperamos atendê-lo novamente em breve.</p><br><br>
                <p>Atenciosamente,<br /><br />
                <strong class="logo">Mr. Doce<br />"Seu Momento Doce,<br />começa aqui!"</strong></p><br><br>
                <p>Atenção: Este é um e-mail automático.<br>
                Por favor, não responda a este e-mail, pois não monitoramos respostas a mensagens automáticas. Se você tiver dúvidas ou precisar de assistência, entre em contato conosco através dos canais de atendimento disponíveis.<br>
                Agradecemos pela sua compreensão!</p>
            </div>
        </div>
    </body>
    </html>
    `;

        const emailBodyAdmin = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="#">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f3f3f3;
            line-height: 1.6;
        }
        .container {
            color: #000;
            max-width: 700px;
            margin: 40px auto;
            padding: 25px;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #ff5c87;
            margin-bottom: 4px;
            color: #fff;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
            font-size: 26px;
            font-weight: 600;
            box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.1);
        }
        h3 {
            color:   #ff5c87;
            font-size: 22px;
            margin: 20px 0 10px;
            font-weight: 500;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
        }
        p {
            margin: 8px 0;
            font-size: 16px;
        }
        p strong {
        color:   #ff5c87;
        }
        ul {
            list-style-type: none;
            padding: 0;
            margin: 15px 0;
        }
        li {
            padding: 10px;
            margin-bottom: 10px;
            background-color: snow;
            border: 1px solid #eee;
            border-radius: 8px;
        }
        li strong {
            display: block;
            color:   #ff5c87;
            margin-bottom: 4px;
        }
        hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding: 15px;
            text-align: center;
            font-size: 14px;
            color: #777;
            background-color: snow;
            border-radius: 0 0 8px 8px;
            border-top: 1px solid #ddd;
        }
        @media (max-width: 600px) {
            .container {
                margin: 20px;
                padding: 20px;
            }
            .header {
                font-size: 24px;
                padding: 15px;
            }
            h3 {
                font-size: 20px;
            }
            p, li {
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            Ficha do Pedido
        </div>
        <h3>Dados do Cliente:</h3>
        <p><strong>Nome:</strong> ${firstName} ${lastName}</p>
        <p><strong>CPF/CNPJ:</strong> ${cpfCnpj}</p>
        <p><strong>Telefone:</strong> ${telephone}</p>
        <p><strong>E-mail:</strong> ${emailLabel}</p>
        <p><strong>Endereço:</strong> ${address}, ${number} - ${city}/${state}</p>
        ${addressComplement ? `<p><strong>Complemento:</strong> ${addressComplement}</p>` : ''}
        <hr>
        <h3>Detalhes do Pedido:</h3>
        <p><strong>Status:</strong> Aguardando confirmação do pagamento...</p>
        <p><strong>Total do Pedido(Frete incluso):</strong> R$ ${totalAmountNumber.toFixed(2)}</p>
        <p><strong>Frete:</strong> ${shippingService.name} - R$ ${shippingService.price.toFixed(2)}</p>
        <h3>Itens do Pedido:</h3>
        <ul>
            ${cart.map(item => `
                <li>
                    <strong>Produto:</strong> ${item.name}
                    <span><strong>Quantidade:</strong> ${item.quantity}</span>
                    <span><strong>Subtotal:</strong> R$ ${item.subtotal.toFixed(2)}</span>
                </li>
            `).join('')}
        </ul>
        <h3>Tempo de Processamento:</h3>
                <ul>
                    <li><strong>PIX:</strong> Processamento em tempo real.</li>
                    <li><strong>Crédito:</strong> Até 2 dias úteis para confirmação.</li>
                    <li><strong>Boleto:</strong> Até 3 dias úteis para compensação.</li>
                    <li><strong>Débito:</strong> Processamento em tempo real.</li>
                </ul>
        <div class="footer">
            <p><strong>Após a confirmação do pagamento o envio deve ser realizado dentro de até 5 dias úteis.
            <br>
            Verifique seu aplicativo do Mercado Pago para acompanhar o status do pagamento.</strong></p>
        </div>
    </div>
    </body>
    </html>
    `;

        // Configuração do envio do e-mail para o cliente.
        const mailOptionsClient = {
            from: process.env.ORDER_EMAIL_USER,
            to: emailLabel,
            subject: `Obrigado pelo seu pedido, ${firstName} ${lastName}`,
            html: emailBodyClient
        };

        transporter.sendMail(mailOptionsClient, (error, info) => {
            if (error) {
                console.log('Erro ao enviar e-mail para o cliente:', error);
            } else {
                console.log('E-mail enviado para o cliente:', info.response);
            }
        });

        // Configuração do envio do e-mail para o administrador.
        const mailOptionsAdmin = {
            from: process.env.ORDER_EMAIL_USER,
            to: process.env.ORDER_EMAIL_USER,
            subject: `Novo Pedido de ${firstName} ${lastName}`,
            html: emailBodyAdmin
        };

        transporter.sendMail(mailOptionsAdmin, (error, info) => {
            if (error) {
                console.log('Erro ao enviar e-mail para o administrador:', error);
                return res.status(500).send('Erro ao enviar pedido.');
            }

            console.log('E-mail enviado para o administrador:', info.response);
            res.status(200).json({ message: 'Pedido enviado com sucesso!' });
        });

    } catch (error) {
        console.error('Erro ao criar preferência de pagamento:', error);
        return res.status(500).send('Erro ao processar o pedido.');
    }
});

// Servidor Online.
app.listen(PORT, () => {
    console.log(`Servidor online em ${PORT}`);
});