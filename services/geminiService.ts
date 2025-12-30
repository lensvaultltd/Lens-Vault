import { GoogleGenerativeAI } from "@google/generative-ai";
import { IPasswordEntry } from "../types";
import { hibpService } from "./hibpService";

// Initialize Gemini AI client
const getAiClient = () => {
  // Use the specific Lens Vault App Key for Gemini (restricted to Generative Language API)
  const apiKey = "AIzaSyCedRjcqw_jEev0mH6jO0PcNbdemC_7UVw";

  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing!");
  }
  return new GoogleGenerativeAI(apiKey);
};


export const getPasswordAudit = async (passwords: IPasswordEntry[]): Promise<string> => {
  try {
    const loginEntries = passwords.filter(p => p.type === 'login' && p.password);

    if (loginEntries.length === 0) {
      return "<h2>No Login Passwords Found</h2><p>You don't have any login entries in your vault to audit.</p>";
    }

    // Check passwords against HIBP
    const pwnedChecks = await Promise.all(loginEntries.map(async (entry) => {
      const pwnedCount = entry.password ? await hibpService.checkPassword(entry.password) : 0;
      return { ...entry, pwnedCount };
    }));

    const passwordGroups = pwnedChecks.reduce((acc, entry) => {
      if (entry.password) {
        acc[entry.password] = acc[entry.password] || [];
        acc[entry.password].push(entry);
      }
      return acc;
    }, {} as Record<string, (IPasswordEntry & { pwnedCount: number })[]>);

    const passwordMetadata = pwnedChecks.map(entry => {
      const isReused = entry.password ? passwordGroups[entry.password].length > 1 : false;
      let strengthLabel = entry.passwordStrength?.label.replace('Very ', '').toLowerCase() || 'unknown';
      if (isReused) {
        strengthLabel = 'reused';
      }

      return {
        siteName: entry.siteName || entry.name,
        passwordStrength: strengthLabel,
        pwnedCount: entry.pwnedCount,
        lastUpdated: new Date(entry.updatedAt).toISOString().split('T')[0],
      };
    });

    const prompt = `
      You are a cybersecurity expert conducting a password audit for a user of a password manager.
      Analyze the following password metadata (DO NOT ask for or mention real passwords).
      
      CRITICAL: Pay attention to 'pwnedCount'. If it is > 0, it means the password has been exposed in a real data breach. This is a HIGH RISK.
      
      Based on the password strength ratings ('strong', 'medium', 'weak', 'reused') and 'pwnedCount', provide a concise, helpful, and actionable security report.

      Format the response as a single block of HTML content.
      - Use semantic HTML tags like <h2> for titles, <p> for paragraphs, and <ul> with <li> for bullet points.
      - Do not include <html>, <head>, or <body> tags.
      - Do not wrap the response in markdown backticks (\`\`\`html).

      The report should include:
      1.  An overall summary of the user's password hygiene.
      2.  A section highlighting specific risks (e.g., "You have 2 weak passwords." or "URGENT: 1 password has appeared in known data breaches.").
      3.  A section with 3-4 clear, actionable recommendations for improvement.

      Here is the password metadata:
      ${JSON.stringify(passwordMetadata, null, 2)}
    `;

    const model = getAiClient().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "<h3>Error</h3><p>An error occurred while analyzing your passwords. Please try again later.</p>";
  }
};

export const runDarkWebAudit = async (email: string): Promise<{ report: string; sources: any[] }> => {
  try {
    // 1. Try Real HIBP API first
    const hibpBreaches = await hibpService.checkEmail(email);

    let promptContext = "";
    if (hibpBreaches.length > 0) {
      promptContext = `
        We queried the 'Have I Been Pwned' database and found the following breaches for this email:
        ${JSON.stringify(hibpBreaches.map(b => ({ Name: b.Name, Title: b.Title, BreachDate: b.BreachDate, Description: b.Description })), null, 2)}
      `;
    } else {
      promptContext = `
        We queried the 'Have I Been Pwned' database and found NO known breaches for this email address.
        However, this doesn't mean the email is completely safe. Provide general security advice.
      `;
    }

    const prompt = `
      You are a cybersecurity expert analyzing whether an email address has been involved in data breaches.
      
      ${promptContext}
      
      Based on this information, provide a security report for the user.
      
      Format the response as a single block of HTML content.
      - Use semantic HTML tags like <h2> for titles, <p> for paragraphs, and <ul> with <li> for bullet points.
      - Do not include <html>, <head>, or <body> tags.
      - Do not wrap the response in markdown backticks.
      
      The report should include:
      1. A clear summary of whether the email was found in breaches.
      2. If breaches were found, list them with dates and what data was exposed.
      3. Actionable recommendations (e.g., change passwords, enable 2FA, monitor credit).
      
      Email address: ${email}
    `;

    const model = getAiClient().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);

    return {
      report: result.response.text(),
      sources: hibpBreaches.map(b => ({
        name: b.Name,
        title: b.Title,
        date: b.BreachDate,
        description: b.Description
      }))
    };
  } catch (error) {
    console.error("Error in dark web audit:", error);
    return {
      report: "<h3>Error</h3><p>An error occurred while analyzing the email for breaches. Please try again later.</p>",
      sources: []
    };
  }
};

export default {
  getPasswordAudit,
  runDarkWebAudit
};