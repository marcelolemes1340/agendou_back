import emailAgendamentoService from '../services/emailAgendamentoService.js';

async function executarVerificacaoLembretes() {
  console.log('🔄 INICIANDO VERIFICAÇÃO AUTOMÁTICA DE LEMBRETES...');
  
  try {
    const resultado = await emailAgendamentoService.verificarLembretesPendentes();
    
    console.log('✅ VERIFICAÇÃO CONCLUÍDA:', {
      totalAgendamentos: resultado.totalAgendamentos,
      lembretesEnviados: resultado.lembretesEnviados,
      sucesso: resultado.success
    });
    
    return resultado;
  } catch (error) {
    console.error('❌ ERRO NA VERIFICAÇÃO AUTOMÁTICA:', error);
    return { success: false, error: error.message };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  executarVerificacaoLembretes().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export default executarVerificacaoLembretes;