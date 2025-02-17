"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackgroundDecorations } from "@/components/background-decorations";
import { Loader2, School, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Course {
  id: string | number;
  name: string;
  course_code?: string;
  term?: {
    name: string;
  };
  start_at?: string;
  enrollment_term_id?: string;
}

interface User {
  id: string | number;
  name: string;
  email?: string;
  avatar_url?: string;
}

interface LMSConnection {
  platform: string;
  domain: string;
  user?: User;
  courses?: Course[];
}

export default function LMSTest() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lmsData, setLMSData] = useState<LMSConnection | null>(null);

  const fetchLMSData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/lms");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch LMS data");
      }

      setLMSData(data.data);
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to fetch LMS data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!lmsData?.platform) return;

    try {
      const response = await fetch("/api/lms", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: lmsData.platform,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to remove LMS integration");
      }

      toast.success("LMS integration removed successfully");
      setLMSData(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    fetchLMSData();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <BackgroundDecorations />

      <div className="z-10 max-w-5xl w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <School className="h-6 w-6" />
            LMS Integration Test
          </h1>
          {lmsData && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Remove Integration
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <Card className="p-6">
            <p className="text-red-500">{error}</p>
          </Card>
        ) : !lmsData ? (
          <Card className="p-6">
            <p>
              No LMS integration found. Please connect an LMS platform first.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Connected Platform</h2>
              <div className="space-y-2">
                <p>
                  <strong>Platform:</strong> {lmsData.platform}
                </p>
                <p>
                  <strong>Domain:</strong> {lmsData.domain}
                </p>
                {lmsData.user && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">User Info</h3>
                    <div className="flex items-center gap-4">
                      {lmsData.user.avatar_url && (
                        <img
                          src={lmsData.user.avatar_url}
                          alt={lmsData.user.name}
                          className="h-12 w-12 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">{lmsData.user.name}</p>
                        {lmsData.user.email && (
                          <p className="text-sm text-gray-500">
                            {lmsData.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
              {!lmsData.courses?.length ? (
                <p>
                  No courses found. Try creating a course in your LMS platform.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {lmsData.courses.map((course) => (
                    <Card key={course.id} className="p-4">
                      <h3 className="font-medium">{course.name}</h3>
                      {course.course_code && (
                        <p className="text-sm text-gray-500">
                          Code: {course.course_code}
                        </p>
                      )}
                      {course.term?.name && (
                        <p className="text-sm text-gray-500">
                          Term: {course.term.name}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
