import 'dotenv/config';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import fetch from "node-fetch";

/* in terminal...
npm i langchain @langchain/core
npm i @langchain/google-genai
npm install langchain dotenv
npm i zod
npm install node-fetch
*/

const model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-2.0-flash",
    temperature: 0
});

const multiply = tool(
  ({ a, b }) => {
    return `The value of ${a} x ${b} is: ${a * b}`;
  },
  {
    name: "multiply",
    description: "Multiply two numbers",
    schema: z.object({
      a: z.number(),
      b: z.number(),
    }),
  }
);

const getWeatherFromCoords = tool(
  async ({ latitude, longitude }) => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph`
    );
    const data = await response.json();
    const weather = data.current_weather;
    return `The current temperature at ${latitude}, ${longitude} is ${weather.temperature}°F with wind speed ${weather.windspeed} mph.`;
  },
  {
    name: "getWeatherFromCoords",
    description: "Get the current weather at a given latitude and longitude.",
    schema: z.object({
      latitude: z.number().describe("Latitude of the location"),
      longitude: z.number().describe("Longitude of the location"),
    }),
  }
);

// create model with tool bindings
const modelWithTools = model.bindTools([multiply,getWeatherFromCoords]);

console.log("\n=== Multiply Tool Usage ===");
const response1 = await modelWithTools.invoke([
  new HumanMessage("What is 15 multiplied by 23?")
]);

if (response1.tool_calls && response1.tool_calls.length > 0) {
  for (const toolCall of response1.tool_calls) {
    if (toolCall.name === "multiply") {
      const result = await multiply.invoke(toolCall.args);
      console.log(result);
    }
  }
}

console.log("\n=== Weather Tool Usage ===");
const response2 = await modelWithTools.invoke([
  new HumanMessage("What is the current weather at 36.9741, 122.0288?")
]);

if (response2.tool_calls && response2.tool_calls.length > 0) {
  for (const toolCall of response2.tool_calls) {
    if (toolCall.name === "getWeatherFromCoords") {
      const result = await getWeatherFromCoords.invoke(toolCall.args);
      console.log(result);
    }
  }
}