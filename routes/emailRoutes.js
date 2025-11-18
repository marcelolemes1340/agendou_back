import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const checkEmailConfig = (req, res, next) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return res.status(500).json({
      success: false,
      message: 'Serviço de email não configurado'
    });
  }
  next();
};

router.post('/contato', checkEmailConfig, async (req, res) => {
  try {
    const { nome, email, telefone, assunto, mensagem } = req.body;

    if (!nome || !email || !assunto || !mensagem) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email, assunto e mensagem são obrigatórios'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, insira um email válido'
      });
    }

    if (mensagem.length > 300) {
      return res.status(400).json({
        success: false,
        message: 'A mensagem não pode ter mais de 300 caracteres'
      });
    }

    const transporter = createTransporter();

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: 'Arial', sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0; 
            padding: 20px; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 15px; 
            overflow: hidden; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
        }
        .header { 
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: bold; 
        }
        .content { 
            padding: 30px; 
        }
        .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-bottom: 20px; 
        }
        .info-item { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            border-left: 4px solid #D4AF37; 
        }
        .info-label { 
            font-weight: bold; 
            color: #2a2a2a; 
            font-size: 12px; 
            text-transform: uppercase; 
            margin-bottom: 5px; 
        }
        .info-value { 
            color: #4a5568; 
            font-size: 14px; 
        }
        .message-box { 
            background: #fff9e6; 
            border: 1px solid #FFD700; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
        }
        .message-label { 
            font-weight: bold; 
            color: #2a2a2a; 
            margin-bottom: 10px; 
            display: block; 
        }
        .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 12px; 
            border-top: 1px solid #e5e7eb; 
        }
        .logo { 
            font-size: 24px; 
            font-weight: bold; 
            color: #D4AF37; 
            margin-bottom: 10px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📩 Nova Mensagem de Contato</h1>
            <p>Barbearia Agendou - Sistema de Contato</p>
        </div>
        
        <div class="content">
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">👤 Nome</div>
                    <div class="info-value">${nome}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📧 Email</div>
                    <div class="info-value">${email}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📞 Telefone</div>
                    <div class="info-value">${telefone || 'Não informado'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">🎯 Assunto</div>
                    <div class="info-value">${assunto}</div>
                </div>
            </div>

            <div class="message-box">
                <span class="message-label">💬 Mensagem:</span>
                <div style="color: #4a5568; line-height: 1.6; white-space: pre-wrap;">${mensagem}</div>
            </div>

            <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #10B981;">
                <div style="font-weight: bold; color: #065f46; margin-bottom: 5px;">📋 Informações Técnicas</div>
                <div style="color: #047857; font-size: 12px;">
                    • Enviado em: ${new Date().toLocaleString('pt-BR')}<br>
                    • Origem: Formulário de Contato Site
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="logo">Agendou</div>
            <p>Sistema Automático de Contato • Barbearia Premium</p>
            <p>Este email foi gerado automaticamente. Por favor, não responda diretamente.</p>
        </div>
    </div>
</body>
</html>
    `;

    const emailText = `
NOVA MENSAGEM DE CONTATO - BARBEARIA AGENDOU

👤 Nome: ${nome}
📧 Email: ${email}
📞 Telefone: ${telefone || 'Não informado'}
🎯 Assunto: ${assunto}

💬 Mensagem:
${mensagem}

---
📋 Informações Técnicas:
• Enviado em: ${new Date().toLocaleString('pt-BR')}
• Origem: Formulário de Contato Site

Agendou - Barbearia Premium
Sistema Automático de Contato
    `;

    const mailOptions = {
      from: `"Sistema Agendou" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_DESTINO || process.env.EMAIL_USER,
      replyTo: email,
      subject: `📨 Contato Site: ${assunto} - ${nome}`,
      text: emailText,
      html: emailHtml,
    };

    const sendEmailPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout no envio do email')), 30000);
    });

    const result = await Promise.race([sendEmailPromise, timeoutPromise]);

    return res.json({
      success: true,
      message: 'Mensagem enviada com sucesso! Entraremos em contato em breve.',
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    let errorMessage = 'Erro ao enviar mensagem. Por favor, tente novamente mais tarde.';
    
    if (error.message.includes('Timeout')) {
      errorMessage = 'Tempo limite excedido no envio do email. Tente novamente.';
    } else if (error.message.includes('Invalid login')) {
      errorMessage = 'Erro de autenticação no servidor de email. Verifique as credenciais.';
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Não foi possível conectar ao servidor de email. Verifique a configuração.';
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/status', async (req, res) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    
    return res.json({
      success: true,
      message: 'Servidor de email conectado com sucesso',
      service: 'Nodemailer'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro na conexão com servidor de email',
      error: error.message
    });
  }
});

export default router;