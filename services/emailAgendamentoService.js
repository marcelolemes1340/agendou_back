import nodemailer from 'nodemailer';
import prisma from '../config/prisma.js';

class EmailAgendamentoService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
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
  }

  isEmailConfigured() {
    return !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
  }

  formatarDataHora(data, horario) {
    const dataObj = new Date(data + 'T' + horario);
    return dataObj.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  deveEnviarLembrete(dataAgendamento, horarioAgendamento) {
    const agora = new Date();
    const dataHoraAgendamento = new Date(dataAgendamento + 'T' + horarioAgendamento);
    
    const diferencaMs = dataHoraAgendamento - agora;
    const diferencaHoras = diferencaMs / (1000 * 60 * 60);
    
    return diferencaHoras <= 24 && diferencaHoras > 0;
  }

  gerarTemplateConfirmacao(agendamento) {
    const dataHoraFormatada = this.formatarDataHora(agendamento.data, agendamento.horario);
    const dataFormatada = new Date(agendamento.data).toLocaleDateString('pt-BR');
    
    return `
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
            background: linear-gradient(135deg, #10B981 0%, #059669 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: bold; 
        }
        .badge { 
            background: #D4AF37; 
            color: white; 
            padding: 5px 15px; 
            border-radius: 20px; 
            font-size: 14px; 
            font-weight: bold; 
            display: inline-block; 
            margin-top: 10px; 
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
            border-left: 4px solid #10B981; 
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
        .success-box { 
            background: #d1fae5; 
            border: 2px solid #10B981; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
            text-align: center; 
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
            color: #10B981; 
            margin-bottom: 10px; 
        }
        .button { 
            display: inline-block; 
            background: #10B981; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold; 
            margin: 10px 5px; 
        }
        .cancel-button { 
            background: #e74c3c; 
        }
        .qr-code { 
            text-align: center; 
            margin: 20px 0; 
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 8px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Agendamento Confirmado!</h1>
            <div class="badge">CONFIRMAÇÃO</div>
            <p>Barbearia Agendou - Seu agendamento foi realizado com sucesso</p>
        </div>
        
        <div class="content">
            <div class="success-box">
                <h3 style="margin: 0; color: #065f46;">🎉 Agendamento Confirmado!</h3>
                <p style="margin: 10px 0; color: #047857;">Seu agendamento foi realizado com sucesso. Estamos ansiosos para atendê-lo!</p>
            </div>

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">👤 Cliente</div>
                    <div class="info-value">${agendamento.nome}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📅 Data</div>
                    <div class="info-value">${dataFormatada}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">⏰ Horário</div>
                    <div class="info-value">${agendamento.horario}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">💈 Serviço</div>
                    <div class="info-value">${agendamento.servico}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">👨‍💼 Profissional</div>
                    <div class="info-value">${agendamento.profissional}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📞 Telefone</div>
                    <div class="info-value">${agendamento.telefone || 'Não informado'}</div>
                </div>
            </div>

            <div class="qr-code">
                <div style="font-weight: bold; color: #2a2a2a; margin-bottom: 10px;">📱 Código do Agendamento</div>
                <div style="background: white; padding: 15px; border-radius: 8px; border: 2px dashed #10B981; font-family: monospace; font-size: 18px; letter-spacing: 2px;">
                    #${agendamento.id.toString().padStart(6, '0')}
                </div>
                <p style="color: #6b7280; font-size: 12px; margin-top: 10px;">
                    Apresente este código no estabelecimento
                </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #10B981;">
                    <div style="font-weight: bold; color: #065f46; margin-bottom: 5px;">📋 Informações Importantes</div>
                    <div style="color: #047857; font-size: 12px;">
                        • Chegue com 5 minutos de antecedência<br>
                        • Traga este comprovante (digital ou impresso)<br>
                        • Em caso de impedimento, cancele com 2h de antecedência<br>
                        • Tempo estimado do serviço: 30-45 minutos
                    </div>
                </div>
            </div>

            <div style="text-align: center; margin-top: 25px;">
                <a href="#" class="button">📅 Ver Meus Agendamentos</a>
                <a href="#" class="button cancel-button">❌ Cancelar Agendamento</a>
            </div>

            <div style="background: #fff9e6; padding: 15px; border-radius: 8px; border-left: 4px solid #D4AF37; margin-top: 20px;">
                <div style="font-weight: bold; color: #92400e; margin-bottom: 5px;">💡 Lembrete</div>
                <div style="color: #b45309; font-size: 12px;">
                    • Você receberá um lembrete 24 horas antes do seu agendamento<br>
                    • Nosso endereço: [Endereço da Barbearia]<br>
                    • WhatsApp: [Número de Contato]
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="logo">Agendou</div>
            <p>Sistema Automático de Confirmação • Barbearia Premium</p>
            <p>Este email foi gerado automaticamente. Por favor, não responda diretamente.</p>
            <p style="font-size: 10px; margin-top: 10px;">
                ID do Agendamento: ${agendamento.id} • 
                Criado em: ${new Date().toLocaleString('pt-BR')}
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  gerarTextoConfirmacao(agendamento) {
    const dataFormatada = new Date(agendamento.data).toLocaleDateString('pt-BR');
    
    return `
✅ AGENDAMENTO CONFIRMADO - BARBEARIA AGENDOU

🎉 SEU AGENDAMENTO FOI REALIZADO COM SUCESSO!

📋 DETALHES DO AGENDAMENTO:
👤 Cliente: ${agendamento.nome}
📅 Data: ${dataFormatada}
⏰ Horário: ${agendamento.horario}
💈 Serviço: ${agendamento.servico}
👨‍💼 Profissional: ${agendamento.profissional}
📞 Telefone: ${agendamento.telefone || 'Não informado'}

📱 CÓDIGO DO AGENDAMENTO: #${agendamento.id.toString().padStart(6, '0')}

📋 INFORMAÇÕES IMPORTANTES:
• Chegue com 5 minutos de antecedência
• Traga este comprovante (digital ou impresso)
• Em caso de impedimento, cancele com 2h de antecedência
• Tempo estimado do serviço: 30-45 minutos

💡 LEMBRETE:
• Você receberá um lembrete 24 horas antes do seu agendamento
• Nosso endereço: [Endereço da Barbearia]
• WhatsApp: [Número de Contato]

📍 ENDEREÇO:
[Seu endereço completo aqui]

📞 CONTATO:
[Seu telefone/WhatsApp aqui]

---
Agendou - Barbearia Premium
Sistema Automático de Confirmação
ID do Agendamento: ${agendamento.id}
Criado em: ${new Date().toLocaleString('pt-BR')}
    `;
  }

  async enviarConfirmacaoAgendamento(agendamento) {
    try {
      if (!this.isEmailConfigured()) {
        console.log('❌ Serviço de email não configurado');
        return { success: false, message: 'Serviço de email não configurado' };
      }

      if (!agendamento.email) {
        console.log('❌ Agendamento sem email, não é possível enviar confirmação');
        return { success: false, message: 'Agendamento sem email' };
      }

      console.log(`📧 Enviando confirmação para: ${agendamento.email} - Agendamento: ${agendamento.id}`);

      const mailOptions = {
        from: `"Barbearia Agendou" <${process.env.EMAIL_USER}>`,
        to: agendamento.email,
        subject: `✅ Agendamento Confirmado - ${agendamento.data} às ${agendamento.horario}`,
        text: this.gerarTextoConfirmacao(agendamento),
        html: this.gerarTemplateConfirmacao(agendamento),
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Confirmação enviada com sucesso para: ${agendamento.email}`);
      
      return { 
        success: true, 
        message: 'Confirmação enviada com sucesso',
        messageId: result.messageId 
      };

    } catch (error) {
      console.error('❌ Erro ao enviar confirmação:', error);
      return { 
        success: false, 
        message: 'Erro ao enviar confirmação',
        error: error.message 
      };
    }
  }

  gerarTemplateLembrete(agendamento) {
    const dataHoraFormatada = this.formatarDataHora(agendamento.data, agendamento.horario);
    
    return `
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
        .badge { 
            background: #D4AF37; 
            color: white; 
            padding: 5px 15px; 
            border-radius: 20px; 
            font-size: 14px; 
            font-weight: bold; 
            display: inline-block; 
            margin-top: 10px; 
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
        .alert-box { 
            background: #fff9e6; 
            border: 2px solid #FFD700; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
            text-align: center; 
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
        .button { 
            display: inline-block; 
            background: #D4AF37; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold; 
            margin: 10px 5px; 
        }
        .cancel-button { 
            background: #e74c3c; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✂️ Lembrete de Agendamento</h1>
            <div class="badge">24h ANTES</div>
            <p>Barbearia Agendou - Confirmação de Agendamento</p>
        </div>
        
        <div class="content">
            <div class="alert-box">
                <h3 style="margin: 0; color: #2a2a2a;">⏰ Seu agendamento está chegando!</h3>
                <p style="margin: 10px 0; color: #4a5568;">Faltam aproximadamente 24 horas para o seu horário marcado.</p>
            </div>

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">👤 Cliente</div>
                    <div class="info-value">${agendamento.nome}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📅 Data & Hora</div>
                    <div class="info-value">${dataHoraFormatada}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">💈 Serviço</div>
                    <div class="info-value">${agendamento.servico}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">👨‍💼 Profissional</div>
                    <div class="info-value">${agendamento.profissional}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📞 Telefone</div>
                    <div class="info-value">${agendamento.telefone || 'Não informado'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📧 Email</div>
                    <div class="info-value">${agendamento.email || 'Não informado'}</div>
                </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #10B981;">
                    <div style="font-weight: bold; color: #065f46; margin-bottom: 5px;">📋 Informações Importantes</div>
                    <div style="color: #047857; font-size: 12px;">
                        • Chegue com 5 minutos de antecedência<br>
                        • Traga comprovante de agendamento se necessário<br>
                        • Em caso de impedimento, cancele com antecedência
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="logo">Agendou</div>
            <p>Sistema Automático de Lembretes • Barbearia Premium</p>
            <p>Este email foi gerado automaticamente. Por favor, não responda diretamente.</p>
            <p style="font-size: 10px; margin-top: 10px;">
                ID do Agendamento: ${agendamento.id} • 
                Enviado em: ${new Date().toLocaleString('pt-BR')}
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  gerarTextoLembrete(agendamento) {
    const dataHoraFormatada = this.formatarDataHora(agendamento.data, agendamento.horario);
    
    return `
LEMBRETE DE AGENDAMENTO - BARBEARIA AGENDOU

⏰ SEU AGENDAMENTO ESTÁ CHEGANDO!
Faltam aproximadamente 24 horas para o seu horário marcado.

📋 DETALHES DO AGENDAMENTO:
👤 Cliente: ${agendamento.nome}
📅 Data & Hora: ${dataHoraFormatada}
💈 Serviço: ${agendamento.servico}
👨‍💼 Profissional: ${agendamento.profissional}
📞 Telefone: ${agendamento.telefone || 'Não informado'}
📧 Email: ${agendamento.email || 'Não informado'}

📋 INFORMAÇÕES IMPORTANTES:
• Chegue com 5 minutos de antecedência
• Traga comprovante de agendamento se necessário
• Em caso de impedimento, cancele com antecedência

📍 ENDEREÇO:
[Sua barbearia aqui]

📞 CONTATO:
[Seu telefone aqui]

---
Agendou - Barbearia Premium
Sistema Automático de Lembretes
ID do Agendamento: ${agendamento.id}
Enviado em: ${new Date().toLocaleString('pt-BR')}
    `;
  }

  async enviarLembreteAgendamento(agendamento) {
    try {
      if (!this.isEmailConfigured()) {
        console.log('❌ Serviço de email não configurado');
        return { success: false, message: 'Serviço de email não configurado' };
      }

      if (!agendamento.email) {
        console.log('❌ Agendamento sem email, não é possível enviar lembrete');
        return { success: false, message: 'Agendamento sem email' };
      }

      console.log(`📧 Enviando lembrete para: ${agendamento.email} - Agendamento: ${agendamento.id}`);

      const mailOptions = {
        from: `"Barbearia Agendou" <${process.env.EMAIL_USER}>`,
        to: agendamento.email,
        subject: `✂️ Lembrete de Agendamento - ${agendamento.data} às ${agendamento.horario}`,
        text: this.gerarTextoLembrete(agendamento),
        html: this.gerarTemplateLembrete(agendamento),
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Lembrete enviado com sucesso para: ${agendamento.email}`);
      
      await prisma.agendamento.update({
        where: { id: agendamento.id },
        data: { 
          observacoes: `Lembrete enviado em: ${new Date().toLocaleString('pt-BR')}` 
        }
      });

      return { 
        success: true, 
        message: 'Lembrete enviado com sucesso',
        messageId: result.messageId 
      };

    } catch (error) {
      console.error('❌ Erro ao enviar lembrete:', error);
      return { 
        success: false, 
        message: 'Erro ao enviar lembrete',
        error: error.message 
      };
    }
  }

  async verificarLembretesPendentes() {
    try {
      console.log('🔍 Verificando lembretes pendentes...');
      
      const agora = new Date();
      const agendamentos = await prisma.agendamento.findMany({
        where: {
          status: {
            in: ['pendente', 'confirmado']
          },
          data: {
            gte: agora.toISOString().split('T')[0] 
          }
        }
      });

      console.log(`📋 ${agendamentos.length} agendamentos futuros encontrados`);

      let lembretesEnviados = 0;
      const resultados = [];

      for (const agendamento of agendamentos) {
        if (this.deveEnviarLembrete(agendamento.data, agendamento.horario)) {
          console.log(`⏰ Enviando lembrete para agendamento ${agendamento.id}`);
          const resultado = await this.enviarLembreteAgendamento(agendamento);
          resultados.push({
            agendamentoId: agendamento.id,
            cliente: agendamento.nome,
            email: agendamento.email,
            resultado: resultado
          });

          if (resultado.success) {
            lembretesEnviados++;
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ ${lembretesEnviados} lembretes enviados com sucesso`);

      return {
        success: true,
        totalAgendamentos: agendamentos.length,
        lembretesEnviados,
        resultados
      };

    } catch (error) {
      console.error('❌ Erro ao verificar lembretes pendentes:', error);
      return {
        success: false,
        message: 'Erro ao verificar lembretes',
        error: error.message
      };
    }
  }
}

export default new EmailAgendamentoService();