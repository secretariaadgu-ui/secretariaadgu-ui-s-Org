
import { FinancialReport, UserAccount } from '../types';
import { getSettings, getUsers } from './storageService';
import { GoogleGenAI } from "@google/genai";

export const sendReportEmailToAdmin = async (report: FinancialReport) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const settings = await getSettings();
    const users = await getUsers();
    const admins = users.filter(u => u.role === 'ADMIN' && u.email);
    
    // Fallback to settings email if no admin has email
    const recipientEmails = admins.length > 0 
      ? admins.map(a => a.email!) 
      : [settings.email];

    if (recipientEmails.length === 0 || !recipientEmails[0]) {
      console.warn("Nenhum e-mail de administrador encontrado para envio.");
      return;
    }

    const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    // Use Gemini to generate a professional email body
    const prompt = `
      Gere um corpo de e-mail profissional e resumido para notificar o administrador sobre a finalização de um relatório financeiro.
      
      Dados do Relatório:
      Instituição: ${report.institutionName}
      Relator: ${report.reporterName}
      Data: ${report.date.split('-').reverse().join('/')}
      Receita Total: ${formatBRL(report.totalRevenue)}
      Despesas Fixas: ${formatBRL(report.totalFixedExpenses)}
      Saldo Líquido (GU): ${formatBRL(report.saldoGU)}
      Saldo em Caixa: ${formatBRL(report.currentBalance)}
      
      O e-mail deve ser em Português (Brasil), ter um tom profissional e incluir um resumo dos valores principais.
      Retorne apenas o corpo do e-mail em texto puro ou HTML simples.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const emailBody = response.text || "Relatório financeiro finalizado.";

    // Real integration logic (using Resend as an example)
    const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;
    
    if (resendApiKey) {
      for (const email of recipientEmails) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'ADGU Portal <onboarding@resend.dev>',
            to: email,
            subject: `Relatório Finalizado - ${report.institutionName} - ${report.date}`,
            html: `<div>${emailBody.replace(/\n/g, '<br>')}</div>`
          })
        });
      }
      console.log("E-mails enviados via Resend.");
    } else {
      // Simulation mode
      console.log("--- SIMULAÇÃO DE ENVIO DE E-MAIL ---");
      console.log(`Para: ${recipientEmails.join(', ')}`);
      console.log(`Assunto: Relatório Finalizado - ${report.institutionName}`);
      console.log(`Corpo:\n${emailBody}`);
      console.log("------------------------------------");
    }

    return true;
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    return false;
  }
};
