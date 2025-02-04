"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RelatedArticleSelector from "./RelatedArticleSelector";
import ReactDOM from "react-dom/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ContentBlock {
  type:
    | "text"
    | "code"
    | "image"
    | "stats"
    | "checklist"
    | "header"
    | "quote"
    | "case-study"
    | "related-articles";
  content: string;
  language?: string;
  title?: string;
  items?: { text: string; checked: boolean }[];
  value?: string;
  label?: string;
}

interface BlogPostFormProps {
  initialData?: {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    published: boolean;
    cover_image?: string;
    image_caption?: string;
    author_name?: string;
  };
  isEditing?: boolean;
}

// Add slug generation function
const generateSlug = (title: string): string => {
  // Remove special characters and replace with spaces
  const sanitized = title.replace(/[^a-zA-Z0-9\s-]/g, " ");

  // Convert to lowercase, trim spaces, replace multiple spaces with single dash
  const baseSlug = sanitized.toLowerCase().trim().replace(/\s+/g, "-");

  // Add last 5 digits of timestamp
  const timestamp = Date.now().toString().slice(-5);

  return `${baseSlug}-${timestamp}`;
};

const AUTHORS = [
  { id: "no-author", name: "No Author" },
  { id: "ai-team", name: "AI Team" },
  { id: "radu-r", name: "Radu R" },
];

export default function BlogPostForm({
  initialData,
  isEditing = false,
}: BlogPostFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    content: initialData?.content || "",
    excerpt: initialData?.excerpt || "",
    published: initialData?.published || false,
    cover_image: initialData?.cover_image || "",
    image_caption: initialData?.image_caption || "",
    author_name: initialData?.author_name || "",
  });
  const [selectedAuthor, setSelectedAuthor] = useState(
    initialData?.author_name
      ? AUTHORS.find((a) => a.name === initialData.author_name)?.id
      : "no-author"
  );

  const addContentBlock = (type: ContentBlock["type"]) => {
    let newBlock = "";
    switch (type) {
      case "code":
        newBlock = "\n```javascript\n// Your code here\n```\n";
        break;
      case "image":
        newBlock = "\n![Image description](image-url)\n";
        break;
      case "stats":
        newBlock = '\n::: stats\nvalue: "85%"\nlabel: "Accuracy Rate"\n:::\n';
        break;
      case "checklist":
        newBlock = "\n- [ ] Task 1\n- [ ] Task 2\n- [x] Completed task\n";
        break;
      case "header":
        newBlock =
          '\n<ArticleHeader\n  title="Section Title"\n  subtitle="Optional subtitle text"\n/>\n';
        break;
      case "quote":
        newBlock =
          '\n<Quote\n  text="Your quote text here"\n  author="Author Name"\n  role="Author Role"\n/>\n';
        break;
      case "case-study":
        newBlock = `
<CaseStudy
  title="Case Study Title"
  challenge="Describe the challenge here"
  solution="Explain the solution here"
  results={[
    "Key result 1",
    "Key result 2",
    "Key result 3"
  ]}
/>
`;
        break;
      case "related-articles":
        setShowBlockMenu(false);
        // Show a modal or dialog with the RelatedArticleSelector
        const dialog = document.createElement("dialog");
        dialog.className =
          "fixed inset-0 z-50 p-4 bg-white rounded-lg shadow-xl max-w-2xl mx-auto mt-20";

        const wrapper = document.createElement("div");
        wrapper.className = "space-y-4";

        const header = document.createElement("div");
        header.className = "flex justify-between items-center border-b pb-4";
        header.innerHTML = `
          <h3 class="text-lg font-medium">Select Related Articles</h3>
          <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('dialog').close()">✕</button>
        `;

        const content = document.createElement("div");
        const root = ReactDOM.createRoot(content);
        root.render(
          <RelatedArticleSelector
            onSelect={(selectedArticles) => {
              const articlesBlock = `
<RelatedArticles
  articles={${JSON.stringify(selectedArticles, null, 2)}}
/>`;
              setFormData((prev) => ({
                ...prev,
                content: prev.content + "\n" + articlesBlock + "\n",
              }));
              dialog.close();
            }}
          />
        );

        wrapper.appendChild(header);
        wrapper.appendChild(content);
        dialog.appendChild(wrapper);
        document.body.appendChild(dialog);
        dialog.showModal();

        dialog.addEventListener("close", () => {
          root.unmount();
          document.body.removeChild(dialog);
        });
        break;
      default:
        newBlock = "\n\n";
    }

    setFormData((prev) => ({
      ...prev,
      content: prev.content + newBlock,
    }));
    setShowBlockMenu(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = isEditing
        ? `/api/admin/posts/${initialData?.slug}`
        : "/api/admin/posts";

      const method = isEditing ? "PUT" : "POST";

      const postData = {
        ...formData,
        author_name:
          selectedAuthor === "no-author"
            ? null
            : AUTHORS.find((a) => a.id === selectedAuthor)?.name,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Something went wrong");
      }

      // Revalidate the blog routes
      await Promise.all([
        fetch("/api/revalidate?path=/blog", { method: "GET" }),
        fetch(`/api/revalidate?path=/blog/${formData.slug}`, { method: "GET" }),
      ]);

      router.push("/admin/blog");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    // Generate slug when title changes (only for new posts)
    if (name === "title" && !isEditing) {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        slug: generateSlug(value),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 mx-auto bg-white p-8 rounded-xl shadow-md"
    >
      <div className="space-y-2">
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Title
        </label>
        <input
          type="text"
          name="title"
          id="title"
          required
          value={formData.title}
          onChange={handleChange}
          className="block w-full px-4 py-3 rounded-lg border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-base"
          placeholder="Enter post title"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          URL Slug (auto-generated)
        </label>
        <div className="block w-full px-4 py-3 rounded-lg border border-gray-100 bg-gray-50 font-mono text-sm text-gray-600">
          {formData.slug}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="excerpt"
          className="block text-sm font-medium text-gray-700"
        >
          Excerpt
        </label>
        <textarea
          name="excerpt"
          id="excerpt"
          required
          value={formData.excerpt}
          onChange={handleChange}
          rows={3}
          className="block w-full px-4 py-3 rounded-lg border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          placeholder="Brief summary of your post"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="author">Author</Label>
        <Select value={selectedAuthor} onValueChange={setSelectedAuthor}>
          <SelectTrigger>
            <SelectValue placeholder="Select an author" />
          </SelectTrigger>
          <SelectContent>
            {AUTHORS.map((author) => (
              <SelectItem key={author.id} value={author.id}>
                {author.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label
            htmlFor="content"
            className="block text-sm font-medium text-gray-700"
          >
            Content (Markdown)
          </label>
          <button
            type="button"
            onClick={() => setShowBlockMenu(!showBlockMenu)}
            className="text-sm text-blue-600 hover:text-blue-700 focus:outline-none"
          >
            Add Block +
          </button>
        </div>
        {showBlockMenu && (
          <div className="absolute bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-2 z-10">
            <button
              type="button"
              onClick={() => addContentBlock("header")}
              className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded"
            >
              Article Header
            </button>
            <button
              type="button"
              onClick={() => addContentBlock("code")}
              className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded"
            >
              Code Block
            </button>
            <button
              type="button"
              onClick={() => addContentBlock("quote")}
              className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded"
            >
              Quote
            </button>
            <button
              type="button"
              onClick={() => addContentBlock("case-study")}
              className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded"
            >
              Case Study
            </button>
            <button
              type="button"
              onClick={() => addContentBlock("stats")}
              className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded"
            >
              Stats
            </button>
            <button
              type="button"
              onClick={() => addContentBlock("checklist")}
              className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded"
            >
              Checklist
            </button>
            <button
              type="button"
              onClick={() => addContentBlock("image")}
              className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded"
            >
              Image
            </button>
            <button
              type="button"
              onClick={() => addContentBlock("related-articles")}
              className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded"
            >
              Related Articles
            </button>
          </div>
        )}
        <textarea
          name="content"
          id="content"
          required
          value={formData.content}
          onChange={handleChange}
          rows={15}
          className="block w-full px-4 py-3 rounded-lg border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-mono text-sm"
          placeholder="# Your post content in Markdown"
          disabled={isLoading}
        />
        <div className="mt-2 space-y-2">
          <p className="text-sm text-gray-500">
            Use Markdown for basic formatting:
          </p>
          <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
            <li>Headers: # H1, ## H2, ### H3</li>
            <li>Lists: - or 1. for bullets or numbers</li>
            <li>Links: [text](url)</li>
            <li>Images: ![alt](url)</li>
            <li>Code: ```language code```</li>
            <li>Stats: ::: stats value: "85%" label: "Accuracy" :::</li>
            <li>Checklist: - [ ] Task or - [x] Done</li>
          </ul>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="cover_image"
          className="block text-sm font-medium text-gray-700"
        >
          Cover Image URL
        </label>
        <input
          type="url"
          name="cover_image"
          id="cover_image"
          value={formData.cover_image}
          onChange={handleChange}
          className="block w-full px-4 py-3 rounded-lg border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          placeholder="https://images.unsplash.com/..."
          disabled={isLoading}
        />
        <p className="mt-2 text-sm text-gray-500">
          For Unsplash images, use the direct image URL. Right-click the image
          and copy image address.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="image_caption"
          className="block text-sm font-medium text-gray-700"
        >
          Image Caption
        </label>
        <textarea
          name="image_caption"
          id="image_caption"
          value={formData.image_caption}
          onChange={handleChange}
          rows={2}
          className="block w-full px-4 py-3 rounded-lg border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          placeholder='Photo by <a href="...">Photographer</a> on <a href="...">Unsplash</a>'
          disabled={isLoading}
        />
        <p className="mt-2 text-sm text-gray-500">
          You can use HTML links for attribution. For Unsplash, copy the
          attribution from the photo download page.
        </p>
      </div>

      <div className="flex items-center space-x-3 bg-gray-50 p-6 rounded-lg border border-gray-100">
        <input
          type="checkbox"
          name="published"
          id="published"
          checked={formData.published}
          onChange={handleChange}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200 transition-colors"
          disabled={isLoading}
        />
        <div>
          <label htmlFor="published" className="font-medium text-gray-900">
            Published
          </label>
          <p className="text-sm text-gray-500">
            Make this post visible to the public
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center shadow-sm"
          disabled={isLoading}
        >
          {isLoading && (
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {isLoading ? "Saving..." : isEditing ? "Update Post" : "Create Post"}
        </button>
      </div>
    </form>
  );
}
