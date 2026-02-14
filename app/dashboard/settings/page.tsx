"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Database, Loader2 } from "lucide-react";

const seedData = [
  { name: "Azhar", position: "FWD", rating: 8, team: "Red" },
  { name: "Anchal", position: "MID", rating: 7, team: "Red" },
  { name: "Player 3", position: "DEF", rating: 7, team: "Red" },
  { name: "Player 4", position: "GK", rating: 8, team: "Red" },
  { name: "Player 5", position: "FWD", rating: 7, team: "Red" },
  { name: "Player 6", position: "MID", rating: 8, team: "Blue" },
  { name: "Player 7", position: "DEF", rating: 7, team: "Blue" },
  { name: "Player 8", position: "GK", rating: 8, team: "Blue" },
  { name: "Player 9", position: "FWD", rating: 7, team: "Blue" },
  { name: "Player 10", position: "MID", rating: 8, team: "Blue" },
];

export default function SettingsPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setSeedMessage(null);

    try {
      // First, check if players already exist
      const { data: existingPlayers, error: checkError } = await supabase
        .from("players")
        .select("id")
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      if (existingPlayers && existingPlayers.length > 0) {
        setSeedMessage("Database already contains players. Clear existing data first if you want to reseed.");
        setIsSeeding(false);
        return;
      }

      // Insert seed data
      const { data, error } = await supabase
        .from("players")
        .insert(seedData)
        .select();

      if (error) throw error;

      setSeedMessage(`Successfully seeded ${data.length} players!`);
    } catch (error: any) {
      console.error("Error seeding database:", error);
      setSeedMessage(`Error: ${error.message || "Failed to seed database"}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage your application settings and database</p>
      </div>

      <div className="max-w-2xl">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Management
            </CardTitle>
            <CardDescription className="text-slate-400">
              Seed the database with initial player data for testing and development.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-300 mb-2">Seed data includes:</p>
              <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
                <li>Azhar (FWD, Red Team, Rating: 8)</li>
                <li>Anchal (MID, Red Team, Rating: 7)</li>
                <li>8 additional players across Red and Blue teams</li>
              </ul>
            </div>

            <Button
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Seeding Database...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Seed Database
                </>
              )}
            </Button>

            {seedMessage && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  seedMessage.includes("Error")
                    ? "bg-red-900/20 border border-red-700 text-red-300"
                    : seedMessage.includes("already")
                    ? "bg-yellow-900/20 border border-yellow-700 text-yellow-300"
                    : "bg-green-900/20 border border-green-700 text-green-300"
                }`}
              >
                {seedMessage}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
