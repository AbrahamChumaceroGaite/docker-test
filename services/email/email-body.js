function generateEmailBody(nombreCompleto, evento, fechae, url, auspiciadores, destinatario) {
    return `
    <html>
    <meta charset="utf-8">
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                color: #333;
                margin: 0;
                padding: 0;
            }

            .container {
                margin: 0 auto;
                max-width: 600px;
                padding: 20px;
            }

            .logo {
                text-align: center;
                margin-bottom: 30px;
            }

            .logo img {
                width: 220px;
                height: auto;
            }

            .header {
                text-align: center;
                margin-bottom: 30px;
            }

            .content {
                background-color: #f2f2f2;
                padding: 20px;
                margin-bottom: 20px;
                border-radius: 5px;
            }

            .footer {
                text-align: center;
                font-size: 12px;
                color: #888;
            }

            a.button {
                display: inline-block;
                background-color: #008CBA;
                color: white;
                padding: 15px 25px;
                text-align: center;
                text-decoration: none;
                font-size: 16px;
                margin: 10px 2px;
                cursor: pointer;
                border-radius: 5px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">
                    <img src="https://tja.ucb.edu.bo/wp-content/uploads/2023/06/logo_ucb_2023.png" alt="Logo UCB">
                </div>
                <h1>Certificado digital</h1>
            </div>

            <div class="content">
                <p>Estimado/a <strong>${nombreCompleto}</strong>,</p>

                <p>Felicidades por completar el<strong> ${evento}</strong> realizado en <strong>${fechae}</strong>. Apreciamos tu esfuerzo y dedicación.</p>

                <p>Estamos encantados de entregar tu certificado digital de participación. Para ver y descargar tu certificado, por favor, sigue el enlace proporcionado a continuación:</p>
                <p>&nbsp;</p>

                <p><a href="${url}" class="button">Recibir Mi Certificado</a></p>

                <p>&nbsp;</p>
                <p>Si el enlace anterior no funciona, copia y pega la siguiente URL en un navegador web abierto: ${url} </p>

                <p>&nbsp;</p>
                <p>Este evento ha sido posible gracias a:<br>
                  <br> <i>${auspiciadores} </i> .</p>

                <p>Atentamente,</p>

                <p>Certificaciones UCB Tarija.</p>
            </div>

            <div class="footer">
                <p>Este es un correo electrónico automático, por favor, no respondas a este mensaje. Si tienes alguna pregunta, contacta con nosotros directamente.<br>
                  Este mensaje ha sido enviado a ${destinatario}, si lo recibiste por error, por favor ignóralo.</p>
            </div>
        </div>
    </body>
    </html>`;
  }
  
  module.exports = { generateEmailBody };
  