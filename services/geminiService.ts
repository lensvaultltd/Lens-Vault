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
import { IPasswordEntry } from "../types";
import { hibpService } from "./hibpService";

// Fix: Per @google/genai guidelines, initialize the client directly with process.env.API_KEY,
// assuming it's always available. API key availability checks have been removed.
// Lazy init to prevent crash if key is missing during app startup
const getAiClient = () => {
  // Use the specific Lens Vault App Key for Gemini (restricted to Generative Language API)
  const apiKey = "AIzaSyCedRjcqw_jEev0mH6jO0PcNbdemC_7UVw";

  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing!");
  }
  return new GoogleGenAI({ apiKey });
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
        pwnedCount: entry.pwnedCount, // Add pwned count to metadata
        lastUpdated: new Date(entry.updatedAt).toISOString().split('T')[0],
      };
    });

    // Fix: Updated prompt to request structured HTML for better and safer rendering.
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

    const response = await getAiClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
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
        
        Use this REAL data to generate the report. Do NOT hallucinate other breaches.
        `;
    } else {
      promptContext = `
        We queried the 'Have I Been Pwned' database and found NO confirmed breaches for this email.
        However, please perform a general web search to see if there are any recent mentions or unconfirmed reports.
        If nothing is found, report that the email appears clean.
        `;
    }

    const prompt = `
      You are a cybersecurity analyst. Your task is to check for publicly reported data breaches associated with the following email address: "${email}".
      
      ${promptContext}

      IMPORTANT: Do not ask for passwords or any other personal information. Only use the provided email address for the search.

      Based on your findings, generate a security report in HTML format.
      The report MUST be a single block of HTML content and should not include \`<html>\`, \`<head>\`, or \`<body>\` tags. Do not wrap the response in markdown backticks.

      The report structure should be:
      1. An \`<h2>\` heading summarizing the audit for the email.
      2. A \`<p>\` tag with an overall assessment.
      3. If breaches are found, provide a \`<ul>\` list. Each \`<li>\` should represent a breach and include:
          - The site name in a \`<strong>\` tag.
          - The date of the breach, if known.
          - A brief description of the types of data compromised.
      4. An \`<h3>\` heading for "Recommendations".
      5. A \`<ul>\` list with 3-4 clear, actionable security recommendations.

      If no breaches are found, still provide general security best practices under the "Recommendations" section.
    `;

    const response = await getAiClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      report: response.text,
      sources
    };

  } catch (error) {
    console.error("Error calling Gemini API for dark web audit:", error);
    return {
      report: "<h3>Error</h3><p>An error occurred while analyzing the email for breaches. Please try again later.</p>",
      sources: []
    };
  }
};