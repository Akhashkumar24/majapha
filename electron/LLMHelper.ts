import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import fs from "fs"

export class LLMHelper {
  private model: GenerativeModel
  private readonly systemPrompt = `You are an Interview Coach AI. Provide concise, natural responses for technical and behavioral interviews.

For technical questions: Clear explanations with reasoning and complexity.
For behavioral questions: Use STAR method naturally.
Keep responses conversational and interview-appropriate - not too long or robotic.`

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
  }

  private async fileToGenerativePart(imagePath: string) {
    const imageData = await fs.promises.readFile(imagePath)
    return {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/png"
      }
    }
  }

  private cleanJsonResponse(text: string): string {
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    text = text.trim();
    return text;
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const imageParts = await Promise.all(imagePaths.map(path => this.fileToGenerativePart(path)))
      
      const prompt = `${this.systemPrompt}

Analyze these images with interview questions. Focus on coding solutions and technical explanations. Return JSON:

{
  "problem_statement": "Clear problem statement",
  "context": "Key technical context", 
  "suggested_responses": ["Main solution with explanation", "Alternative approach", "Key considerations"],
  "reasoning": "Why this solution works"
}

Keep explanations concise but complete.`

      const result = await this.model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      return JSON.parse(text)
    } catch (error) {
      console.error("Error extracting problem from images:", error)
      throw error
    }
  }

  public async generateSolution(problemInfo: any) {
    const prompt = `${this.systemPrompt}

Interview question: ${JSON.stringify(problemInfo, null, 2)}

Provide concise interview response in JSON:

{
  "solution": {
    "code": "Solution with clear explanation",
    "problem_statement": "Restate question", 
    "context": "Key approach points",
    "suggested_responses": ["Main response", "Alternative", "Follow-up"],
    "reasoning": "Why this works"
  }
}

Technical questions: Code + complexity + alternatives (concise).
Behavioral questions: STAR method naturally integrated.
Keep responses interview-length, not essays.`

    console.log("[LLMHelper] Generating interview response...");
    try {
      const result = await this.model.generateContent(prompt)
      console.log("[LLMHelper] Generated interview response.");
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      const parsed = JSON.parse(text)
      console.log("[LLMHelper] Parsed interview response:", parsed)
      return parsed
    } catch (error) {
      console.error("[LLMHelper] Error in generateSolution:", error);
      throw error;
    }
  }

  public async debugSolutionWithImages(problemInfo: any, currentCode: string, debugImagePaths: string[]) {
    try {
      const imageParts = await Promise.all(debugImagePaths.map(path => this.fileToGenerativePart(path)))
      
      const prompt = `${this.systemPrompt}

Original problem: ${JSON.stringify(problemInfo, null, 2)}
Current approach: ${currentCode}

Analyze the debug information in these images and provide an improved interview response:

{
  "solution": {
    "code": "Improved solution with detailed explanation",
    "problem_statement": "Clarified problem statement",
    "context": "Updated context based on debug info", 
    "suggested_responses": ["Refined primary response", "Alternative improved approach", "Additional insights"],
    "reasoning": "Explanation of improvements and why they work better"
  }
}

Focus on providing interview-quality explanations that address any issues found in the debug information.`

      const result = await this.model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      const parsed = JSON.parse(text)
      console.log("[LLMHelper] Generated improved interview response:", parsed)
      return parsed
    } catch (error) {
      console.error("Error debugging solution with images:", error)
      throw error
    }
  }

  public async analyzeAudioFile(audioPath: string) {
    try {
      const audioData = await fs.promises.readFile(audioPath);
      const audioPart = {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: "audio/mp3"
        }
      };
      
      const prompt = `${this.systemPrompt}

Listen to this interview question. Provide a natural, concise response that sounds conversational but complete.

Technical questions: Clear explanation + approach + complexity.
Behavioral questions: STAR method with specific example.
Keep it interview-length - thorough but not lengthy.`;

      const result = await this.model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing audio file:", error);
      throw error;
    }
  }

  public async analyzeAudioFromBase64(data: string, mimeType: string) {
    try {
      const audioPart = {
        inlineData: {
          data,
          mimeType
        }
      };
      
      const prompt = `You are an interview coach. Listen to this question and provide a concise, natural response.

Technical: Clear solution + reasoning + complexity.
Behavioral: STAR method with specific example.
System Design: Requirements → approach → trade-offs.

Sound natural and confident. Keep responses interview-appropriate length.`;

      const result = await this.model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing audio from base64:", error);
      throw error;
    }
  }

  public async analyzeImageFile(imagePath: string) {
    try {
      const imageData = await fs.promises.readFile(imagePath);
      const imagePart = {
        inlineData: {
          data: imageData.toString("base64"),
          mimeType: "image/png"
        }
      };
      
      const prompt = `${this.systemPrompt}

Analyze this interview question image. Focus on technical content only.

Coding problems: Complete solution + explanation + complexity.
Technical concepts: Clear explanation + examples + applications.

Respond naturally as if explaining to an interviewer. Keep it focused and interview-length.`;

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing image file:", error);
      throw error;
    }
  }

  public async chatWithGemini(message: string): Promise<string> {
    try {
      const contextualPrompt = `${this.systemPrompt}

User message: ${message}

Provide a helpful response for interview preparation. If this is a practice question, give a complete interview-ready answer. If it's a request for advice, provide practical interview guidance.`;

      const result = await this.model.generateContent(contextualPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("[LLMHelper] Error in chatWithGemini:", error);
      throw error;
    }
  }
}
