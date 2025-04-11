# Server-Side Fix for OpenAI JSON Parsing Issue

The OpenAI response is being returned with a format that can't be parsed correctly. The error shows:
```
Error parsing OpenAI response: SyntaxError: Unexpected token '`', "```json
```

This suggests the OpenAI response contains markdown-formatted JSON with code fence markers (```json) that can't be parsed.

## Add a New Direct Testing Endpoint

Add this endpoint to your server (index.ts):

```typescript
// New endpoint for direct API testing with explicit JSON formatting instructions
app.post('/api/direct-suggestions', async (req, res) => {
  try {
    const { content, jobDescription, format } = req.body;
    
    console.log("Direct API test:");
    console.log("- Content length:", content?.length || 0);
    console.log("- Job description:", jobDescription);
    
    if (!content || !jobDescription) {
      return res.status(400).json({ error: "Missing content or job description" });
    }
    
    // Create an explicit prompt that forces JSON output
    const prompt = `
You are an AI assistant helping improve a resume to better match a job description.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${content}

Based on the job description, suggest improvements to the resume. 
Identify key sections or phrases that can be enhanced or modified to better align with the job requirements.

IMPORTANT: Respond ONLY with a valid JSON array where each item has "original" and "improved" fields.
Do not include any explanations, markdown, or code blocks. Just the raw JSON array.

Example format:
[
  {
    "original": "Managed a team of 5 people",
    "improved": "Led a cross-functional team of 5 people, driving project completion 15% ahead of schedule"
  },
  {
    "original": "Proficient in JavaScript",
    "improved": "Expert in JavaScript with 5+ years of experience building complex frontend applications"
  }
]
`;

    // Call OpenAI with the prompt
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional resume writer who helps optimize resumes for specific job descriptions. Always output valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }  // Force JSON format (OpenAI API feature)
    });
    
    // Get the response content
    const responseContent = completion.choices[0]?.message?.content || "{}";
    console.log("Raw OpenAI response:", responseContent.substring(0, 200) + "...");
    
    // Attempt to extract JSON if there are markdown code fences
    let jsonContent = responseContent;
    if (responseContent.includes("```")) {
      // Extract content between code fences
      const match = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match && match[1]) {
        jsonContent = match[1].trim();
        console.log("Extracted JSON from markdown code block");
      }
    }
    
    try {
      // Parse the JSON
      const parsedResponse = JSON.parse(jsonContent);
      
      // Return the suggestions
      return res.json({
        success: true,
        suggestions: Array.isArray(parsedResponse) ? parsedResponse : 
                     parsedResponse.suggestions || parsedResponse.results || []
      });
    } catch (jsonError) {
      console.error("JSON parsing error:", jsonError);
      console.error("Attempted to parse:", jsonContent);
      return res.status(500).json({ error: "Failed to parse OpenAI response as JSON" });
    }
  } catch (error) {
    console.error("Error in direct API test:", error);
    return res.status(500).json({ error: String(error) });
  }
});
```

## Fix the OpenAI Response Processing Function

You also need to update your existing OpenAI response processing function (likely in `processOpenAIResponse` or similar) to handle markdown-formatted JSON:

```typescript
function processOpenAIResponse(responseContent) {
  try {
    console.log("Processing OpenAI response:", responseContent.substring(0, 200) + "...");
    
    // Handle responses that might be wrapped in markdown code blocks
    let jsonContent = responseContent;
    if (responseContent.includes("```")) {
      // Extract content between code fences
      const match = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match && match[1]) {
        jsonContent = match[1].trim();
        console.log("Extracted JSON from markdown code block");
      }
    }
    
    // Parse the JSON
    const parsedResponse = JSON.parse(jsonContent);
    
    // Return the appropriate format
    return {
      suggestions: Array.isArray(parsedResponse) ? parsedResponse : 
                  parsedResponse.suggestions || parsedResponse.results || []
    };
  } catch (error) {
    console.error("Error processing OpenAI response:", error);
    throw error;
  }
}
```

## If Using the New OpenAI SDK (v4+)

If you're using the newer OpenAI SDK, make sure to use the `response_format` parameter to force JSON output:

```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [...],
  response_format: { type: "json_object" }  // Force JSON format
});
```

This should fix the JSON parsing issues you're encountering. 