const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateApp(prompt) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `You are an expert web developer. Generate a complete, 
working single-page React application based on the user's request. 
Return ONLY valid JSX code for App.jsx with inline Tailwind CSS classes. 
No explanations, no markdown, just the code.`;

    const result = await model.generateContent(`${systemPrompt}\n\nUser request: ${prompt}`);
    const response = await result.response;
    return response.text();
}

module.exports = { generateApp };
