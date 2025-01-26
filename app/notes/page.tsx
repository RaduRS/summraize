import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function addEntry(formData: FormData) {
  "use server";

  const headersList = await headers();
  const supabase = createClient(new Request("/", { headers: headersList }));
  const content = formData.get("content") as string;

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  // First ensure the table exists
  await supabase.from("entries").upsert([], { count: "exact" }).select();

  // Insert the new entry
  await supabase.from("entries").insert([
    {
      content,
      user_id: user.id,
      completed: false,
    },
  ]);

  revalidatePath("/notes");
}

export default async function Notes() {
  const headersList = await headers();
  const supabase = createClient(new Request("/", { headers: headersList }));

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get only entries for the current user
  const { data: entries } = await supabase
    .from("entries")
    .select()
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Tabs defaultValue="todos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="todos">
          <div className="space-y-4">
            <form action={addEntry} className="mb-4">
              <input
                type="text"
                name="content"
                placeholder="Add a new todo..."
                className="w-full p-2 border rounded"
                required
              />
              <button
                type="submit"
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Todo
              </button>
            </form>

            <div className="space-y-2">
              {entries
                ?.filter((entry) => !entry.completed)
                .map((entry) => (
                  <div key={entry.id} className="p-3 border rounded">
                    {entry.content}
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="completed">
          <div className="space-y-2">
            {entries
              ?.filter((entry) => entry.completed)
              .map((entry) => (
                <div key={entry.id} className="p-3 border rounded">
                  {entry.content}
                </div>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
