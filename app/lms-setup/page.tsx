"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  School,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Settings,
} from "lucide-react";
import { BackgroundDecorations } from "@/components/background-decorations";
import { testLMSConnection } from "@/app/lib/lms";
import { useToast } from "@/hooks/use-toast";

const lmsPlatforms = [
  {
    name: "canvas",
    displayName: "Canvas LMS",
    logo: School,
    description: "Connect with Canvas to enable seamless content integration",
    fields: [
      {
        name: "domain",
        label: "Canvas Domain",
        placeholder: "university.instructure.com",
      },
      { name: "token", label: "Access Token", type: "password" },
    ],
  },
  {
    name: "blackboard",
    displayName: "Blackboard",
    logo: School,
    description: "Integrate with Blackboard for automated content sync",
    fields: [
      {
        name: "domain",
        label: "Blackboard Domain",
        placeholder: "blackboard.university.edu",
      },
      { name: "clientId", label: "Client ID" },
      { name: "clientSecret", label: "Client Secret", type: "password" },
    ],
  },
  {
    name: "moodle",
    displayName: "Moodle",
    logo: School,
    description: "Connect your Moodle instance for enhanced functionality",
    fields: [
      {
        name: "domain",
        label: "Moodle Domain",
        placeholder: "moodle.university.edu",
      },
      { name: "token", label: "Web Service Token", type: "password" },
    ],
  },
  {
    name: "brightspace",
    displayName: "D2L Brightspace",
    logo: School,
    description: "Integrate with Brightspace for seamless content delivery",
    fields: [
      {
        name: "domain",
        label: "Brightspace Domain",
        placeholder: "university.brightspace.com",
      },
      { name: "clientId", label: "Client ID" },
      { name: "clientSecret", label: "Client Secret", type: "password" },
    ],
  },
];

export default function LMSSetup() {
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handlePlatformSelect = (platform: string) => {
    setSelectedPlatform(platform);
    setCredentials({});
  };

  const handleCredentialChange = (field: string, value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleConnect = async () => {
    if (!selectedPlatform) return;

    setIsLoading(true);
    try {
      // Test the connection
      const result = await testLMSConnection(
        selectedPlatform as any,
        credentials as any
      );

      if (result.success) {
        // Save the credentials and user data
        const response = await fetch("/api/lms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: selectedPlatform,
            credentials,
            userData: result.data.user,
            courses: result.data.courses,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save credentials");
        }

        toast({
          title: "Success!",
          description: "LMS connection established successfully.",
          variant: "default",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to LMS",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlatformConfig = lmsPlatforms.find(
    (p) => p.name === selectedPlatform
  );

  return (
    <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
      <BackgroundDecorations variant="clean" />

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">LMS Integration Setup</h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Connect your Learning Management System to enable seamless content
            integration and enhanced functionality
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lmsPlatforms.map((platform) => (
            <Card
              key={platform.name}
              className={`p-6 cursor-pointer transition-all ${
                selectedPlatform === platform.name
                  ? "ring-2 ring-purple-500"
                  : "hover:shadow-lg"
              }`}
              onClick={() => handlePlatformSelect(platform.name)}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <platform.logo className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold">
                  {platform.displayName}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {platform.description}
              </p>
            </Card>
          ))}
        </div>

        {selectedPlatformConfig && (
          <Card className="mt-8 p-6">
            <h3 className="text-xl font-semibold mb-6">
              Configure {selectedPlatformConfig.displayName}
            </h3>
            <div className="space-y-4">
              {selectedPlatformConfig.fields.map((field) => (
                <div key={field.name}>
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    type={field.type || "text"}
                    placeholder={field.placeholder}
                    value={credentials[field.name] || ""}
                    onChange={(e) =>
                      handleCredentialChange(field.name, e.target.value)
                    }
                  />
                </div>
              ))}
              <Button
                className="w-full mt-4"
                onClick={handleConnect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <>
                    Connect {selectedPlatformConfig.displayName}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        <div className="mt-12 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold">Need Help?</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Our team can help you set up and configure your LMS integration.
            Contact us for personalized assistance.
          </p>
          <Button variant="outline" className="gap-2">
            Contact Support
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
