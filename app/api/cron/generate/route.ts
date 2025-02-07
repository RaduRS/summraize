import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";
import { BLOG_IDEAS } from "@/constants/blogIdeas";

export const runtime = "edge";
export const preferredRegion = "auto";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Set maximum duration to 5 minutes

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add detailed logging
function log(message: string, data?: any) {
  console.log(`[Blog Generator] ${message}`, data ? JSON.stringify(data) : "");
}

// Get today's blog topic
function getTodaysBlogIdea() {
  const today = new Date().toISOString().split("T")[0];
  const blogIdea = BLOG_IDEAS.find((idea) => idea.date === today);

  if (!blogIdea) {
    throw new Error("No blog topic found for today");
  }

  return blogIdea;
}

const BLOG_PROMPT = `You are an expert **blog post generator** specializing in creating engaging, well-researched content. Your task is to create a **long-form, fact-based, and SEO-optimized** article based on the following topic:

**Topic:** {TOPIC}

**Target Audience:** {AUDIENCE}

**Description:** {DESCRIPTION}

**IMPORTANT:**  
✅ **All facts, statistics, and quotes must be REAL.**  
✅ **Research online and reference credible sources** (McKinsey, Harvard, Forbes, industry leaders).  
✅ **Do not fabricate data. If unsure, find the latest stats online.**  
✅ **Ensure every generated post is unique and not repetitive.**  

---

## **Content Requirements:**
- **At least 2000 words** (well-researched, engaging, and insightful).  
- **Use Markdown formatting** with proper structure.  
- **Include multiple sections with real-world insights.**  
- **Use the images provided in the optionalImages array.**  
- **Do NOT use placeholder examples—generate fresh, unique content every time.**  

### **Mandatory Sections & Elements:**
The article **must** follow these EXACT formatting rules to ensure MDX compatibility:

1️⃣ **Article Headers:**  
   - Use \`<ArticleHeader>\` for every major section.
   - Format: \`<ArticleHeader title="Section Title" subtitle="Optional Subtitle"/>\`
   - ALWAYS use double quotes (") for props, never single quotes
   - Do NOT combine with markdown headings (##)
   - Example:
     \`\`\`
     <ArticleHeader title="Introduction" subtitle="The Future of Work"/>
     Content goes here...
     \`\`\`

2️⃣ **Quotes from Experts:**  
   - Use \`<Quote>\` component with text, author, and role props
   - ALWAYS use double quotes (") for all props
   - Real quotes from experts, not placeholder examples
   - Format: \`<Quote text="Quote text here" author="Author Name" role="Author Role"/>\`
   - Example:
     \`<Quote text="AI is transforming how we work" author="Satya Nadella" role="CEO, Microsoft"/>\`

3️⃣ **Statistics Block:**
   - Use the \`::: stats\` block with simple key-value format
   - NO JSON format, use simple key-value pairs
   - Format:
     \`\`\`
     ::: stats
     title: "Statistics Title"
     value: "95%" label: "First Stat Label"
     value: "40%" label: "Second Stat Label"
     :::
     \`\`\`
     Exemple:
        ::: stats
     title: "AI Impact on Productivity"
     value: "40%" label: "Potential Increase in Productivity"
     value: "70%" label: "Cost Reduction with AI"
     :::

4️⃣ **Case Studies:**
   - Use the \`<CaseStudies>\` component with an array of studies
   - Can include either one or two case studies
   - For a single case study:
     \`\`\`
     <CaseStudies studies={[
       {
         title: "Company Name",
         challenge: "Brief description of the challenge",
         solution: "Brief description of the solution",
         results: [
           "First measurable result with percentage",
           "Second measurable result"
         ]
       }
     ]}/>
     \`\`\`
   - For two case studies (preferred when comparing approaches):
     \`\`\`
     <CaseStudies studies={[
       {
         title: "First Company",
         challenge: "First challenge description",
         solution: "First solution approach",
         results: [
           "First company result 1",
           "First company result 2"
         ]
       },
       {
         title: "Second Company",
         challenge: "Second challenge description",
         solution: "Second solution approach",
         results: [
           "Second company result 1",
           "Second company result 2"
         ]
       }
     ]}/>
     \`\`\`
   - ALWAYS use real companies and verifiable results
   - Keep challenges and solutions concise but specific
   - Include 2-3 measurable results per case study
   - When possible, use two complementary case studies to show different applications

5️⃣ **Images:**  
   - Use standard markdown format
   - Format:
     \`\`\`
     ![Alt Text](image-url-provided-in-optionalImages)
     \`\`\`

❗ **CRITICAL FORMATTING RULES:**
- Use double quotes (") for all component props
- Avoid apostrophes in text when possible
- Remove trailing spaces in JSON blocks
- Keep exact spacing in stats block
- NEVER mix markdown headings (##, ###) with components
- NEVER put any image at the end of the article
- NEVER put one image after another without some content in between
- Each major section should ONLY use <ArticleHeader>, not markdown headings
- Place components on their own lines, not nested under headings
- Test all generated content for MDX compatibility

**CORRECT Structure Example:**
\`\`\`
<ArticleHeader title="Introduction" subtitle="The Future of Work"/>
Content goes here...

<ArticleHeader title="Key Benefits" subtitle="How AI Helps"/>
More content...

<Quote text="The quote here" author="Author Name" role="Role Here"/>
\`\`\`

**INCORRECT Structure (DO NOT USE):**
\`\`\`
### <ArticleHeader title="Introduction" subtitle="The Future of Work"/>
Content...

\`\`\`

---

## **What the AI Must Do:**
- **Fetch real, latest industry insights** (do NOT reuse old or generic content).  
- **Ensure facts, quotes, and sources are 100% verifiable** (include reference links if necessary).  
- **Generate content that is truly unique each time**—avoid repeating structures or case studies.  
- **Format the response correctly in Markdown and JSON.**  

---

## **Output Structure:**
Return a JSON object in this format:

{
  "title": "Engaging, SEO-Optimized Title",
  "slug": "The slug must be a URL-friendly version of the title followed by a 6-digit timestamp. Convert the title to lowercase, remove special characters, replace spaces with hyphens, and append a dash followed by the last 6 digits of the current timestamp. Example: 'my-blog-post-123456'",
  "content": "Markdown-formatted content including headers, quotes, stats, checklists, and images",
  "excerpt": "One-sentence summary optimized for SEO and social media.",
  "date": "${new Date().toISOString()}",
  "author_name": "Radu R",
  "cover_image": "Use the image provided as coverImage",
}

---
`;

export async function POST(request: Request) {
  try {
    log("Starting blog post generation");

    const { coverImage, optionalImages = [] } = await request.json();

    if (!coverImage) {
      return NextResponse.json(
        { success: false, message: "Cover image URL is required" },
        { status: 400 }
      );
    }

    // Get today's blog idea
    const blogIdea = getTodaysBlogIdea();
    log("Retrieved blog idea for today", blogIdea);

    const supabase = await createClient();
    log("Supabase client created");

    // Generate a 6-digit timestamp for the slug
    const timestamp = Date.now().toString().slice(-6);
    log("Generated timestamp for slug:", timestamp);

    // Create the prompt with today's topic
    const finalPrompt = BLOG_PROMPT.replace("{TOPIC}", blogIdea.topic)
      .replace("{AUDIENCE}", blogIdea.audience)
      .replace("{DESCRIPTION}", blogIdea.description);

    // Add optional images to the prompt
    const promptWithImages =
      finalPrompt +
      `
**Images:**  \n   - Use these provided image URLs in markdown format where appropriate:\n${
        optionalImages.length > 0
          ? optionalImages
              .map((url: string) => `   - ![AI and Productivity](${url})`)
              .join("\n")
          : "   - No additional images provided"
      }`;

    // Generate blog post using OpenAI
    log("Calling OpenAI API");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional blog post generator. You create well-researched, fact-based, SEO-optimized content using real data. Focus on incorporating real-world case studies from major companies, using verifiable results and metrics.",
        },
        {
          role: "user",
          content: promptWithImages,
        },
      ],
      temperature: 0.6,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    });

    if (!completion.choices[0]?.message?.content) {
      log("Missing content in OpenAI response");
      throw new Error("Missing content in OpenAI response");
    }

    log("Successfully received response from OpenAI");
    const generatedPost = JSON.parse(completion.choices[0].message.content);

    // Override the cover_image with the provided one
    generatedPost.cover_image = coverImage;

    // Create a shorter slug from the first 5 words of the title plus timestamp
    const shortSlug = generatedPost.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(" ")
      .slice(0, 5)
      .join("-")
      .concat(`-${timestamp}`);

    generatedPost.slug = shortSlug;

    // Validate the generated post structure
    const requiredFields = ["title", "slug", "content", "date"];
    for (const field of requiredFields) {
      if (!generatedPost[field]) {
        log(`Missing required field in generated post: ${field}`);
        throw new Error(`Generated post is missing required field: ${field}`);
      }
    }

    log("Generated post validation successful", {
      title: generatedPost.title,
      slug: generatedPost.slug,
    });

    // Insert the post into the database
    log("Inserting post into database");
    const { error: insertError } = await supabase.from("blog_posts").insert({
      title: generatedPost.title,
      slug: generatedPost.slug,
      content: generatedPost.content,
      excerpt: generatedPost.excerpt,
      date: generatedPost.date,
      cover_image: generatedPost.cover_image,
      author_name: generatedPost.author_name,
      image_caption: generatedPost.image_caption,
      published: true,
    });

    if (insertError) {
      log("Database insertion error", insertError);
      throw new Error(`Failed to insert blog post: ${insertError.message}`);
    }

    log("Blog post successfully generated and saved", {
      title: generatedPost.title,
      slug: generatedPost.slug,
    });

    return NextResponse.json({
      success: true,
      message: "Blog post generated and saved successfully",
      post: generatedPost,
    });
  } catch (error: unknown) {
    log("Error in blog post generation", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate blog post",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
