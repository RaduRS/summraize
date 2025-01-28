Look in my @codebase to catch up if you need to.
We need to update the both backend and front probably to reflect this changes


Task: Build a Token-Based Credit System
Goal: We need to design a credit-based pricing system for the app where user actions are priced in credits instead of dollars. The credits will reflect operational costs, include a profit margin, and allow scalability.

Conversion:
1,000 credits = $1.00
Current Pricing and APIs:
1. Voice Assistant
a. Audio to Text

API: Deepgram
Cost: $0.0043/min.
Billing Rules:
Charged as a full minute even if under 60 seconds (e.g., 1:01 = 2 mins = $0.0086).
b. Text Summarization

API: DeepSeek
Costs:
Input tokens: $0.14 per 1M tokens.
Input tokens (cache miss): $0.55 per 1M tokens.
Output tokens: $2.19 per 1M tokens.
c. Text-to-Speech (TTS)

API: Google Cloud TTS
Cost: $0.000004 per character (or $4 per 1M characters).
2. Document Converter
a. Image to Text

API: OpenAI GPT-4o-Mini
Costs:
$0.005 per image.
I think pdf and txt are free becasue we do it internally (can you confirm at the end)
b. Full Text-to-Speech

API: Google Cloud TTS
Cost: Same as above: $0.000004 per character.
c. Summary-to-Speech

Flow:
Generate the summary (DeepSeek, costs as above).
Convert the summary to speech (Google Cloud TTS, costs as above).
Pricing Strategy:
To ensure profitability while covering operational costs:

Set a Markup Factor: Multiply your costs by 3x to 5x.

Example: If the service costs you 10 credits, charge the user 30-50 credits.
Estimate Costs in Credits:
Convert all dollar-based costs into credits using 1,000 credits = $1:

Example: $0.0043/min = 4.3 credits/min.
Add your markup. For 4x markup, charge 17.2 credits/min for audio transcription.
Adjust for Usability:

Round off credit costs for simplicity (e.g., 17.2 credits → 18 credits).

