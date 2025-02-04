"use client";

interface DeletePostButtonProps {
  slug: string;
}

export default function DeletePostButton({ slug }: DeletePostButtonProps) {
  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this post?")) {
      const res = await fetch(`/api/admin/posts/${slug}`, {
        method: "DELETE",
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Failed to delete post");
      }
    }
  };

  return (
    <button onClick={handleDelete} className="text-red-600 hover:text-red-900">
      Delete
    </button>
  );
}
