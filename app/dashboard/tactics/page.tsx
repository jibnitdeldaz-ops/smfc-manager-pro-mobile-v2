"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Shirt } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Player {
  id: number;
  name: string;
  position: string;
  rating: number;
  team: string;
}

export default function TacticsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("name");

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = (playerId: number) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  return (
    <div className="flex h-full gap-6 p-6">
      {/* Player List Sidebar */}
      <div className="w-80 flex-shrink-0">
        <Card className="bg-slate-800 border-slate-700 h-full">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Squad List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading players...</div>
            ) : players.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No players found. Seed the database from Settings.
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedPlayers.includes(player.id)
                        ? "bg-green-600/20 border border-green-500/50"
                        : "bg-slate-700/50 hover:bg-slate-700 border border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white font-bold ${
                        player.team === "Red" ? "bg-red-600" : "bg-blue-600"
                      }`}>
                        {player.id}
                      </div>
                      <div>
                        <div className="text-white font-medium">{player.name}</div>
                        <div className="text-xs text-slate-400">{player.position}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-sm font-semibold text-green-400">
                        {player.rating}
                      </div>
                      <div className={`text-xs ${
                        player.team === "Red" ? "text-red-400" : "text-blue-400"
                      }`}>
                        {player.team}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tactical Board */}
      <div className="flex-1">
        <Card className="bg-slate-800 border-slate-700 h-full">
          <CardHeader>
            <CardTitle className="text-white">Tactical Board</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full aspect-[3/2] bg-gradient-to-b from-green-600 to-green-700 rounded-lg overflow-hidden border-4 border-white shadow-2xl">
              {/* Pitch Lines */}
              <div className="absolute inset-0 border-2 border-white/30">
                {/* Center Circle */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/30 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/50 rounded-full"></div>

                {/* Center Line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30"></div>

                {/* Penalty Areas */}
                {/* Top Penalty Area */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-48 h-24 border-2 border-white/30 border-b-0"></div>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-16 border-2 border-white/30 border-b-0 rounded-t-full"></div>

                {/* Bottom Penalty Area */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-48 h-24 border-2 border-white/30 border-t-0"></div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-16 border-2 border-white/30 border-t-0 rounded-b-full"></div>

                {/* Corner Arcs */}
                <div className="absolute top-0 left-0 w-8 h-8 border-2 border-white/30 border-r-0 border-b-0 rounded-tl-full"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-2 border-white/30 border-l-0 border-b-0 rounded-tr-full"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-2 border-white/30 border-r-0 border-t-0 rounded-bl-full"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-2 border-white/30 border-l-0 border-t-0 rounded-br-full"></div>
              </div>

              {/* Player Positions - 4-4-2 Formation */}
              <div className="absolute inset-0 p-4">
                {/* Goalkeeper */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white font-bold shadow-lg">
                      1
                    </div>
                    <div className="mt-1 text-xs text-white font-semibold bg-black/50 px-2 py-0.5 rounded">
                      GK
                    </div>
                  </div>
                </div>

                {/* Defenders */}
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-16">
                  {[2, 4, 5, 3].map((num, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white font-bold shadow-lg">
                        {num}
                      </div>
                      <div className="mt-1 text-xs text-white font-semibold bg-black/50 px-2 py-0.5 rounded">
                        {idx === 0 ? "RB" : idx === 1 ? "CB" : idx === 2 ? "CB" : "LB"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Midfielders */}
                <div className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 translate-y-4 flex gap-16">
                  {[7, 6, 8, 11].map((num, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white font-bold shadow-lg">
                        {num}
                      </div>
                      <div className="mt-1 text-xs text-white font-semibold bg-black/50 px-2 py-0.5 rounded">
                        {idx === 0 ? "RW" : idx === 1 ? "CM" : idx === 2 ? "CM" : "LW"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Forwards */}
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 flex gap-24">
                  {[9, 10].map((num, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white font-bold shadow-lg">
                        {num}
                      </div>
                      <div className="mt-1 text-xs text-white font-semibold bg-black/50 px-2 py-0.5 rounded">
                        ST
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Formation Selector */}
            <div className="mt-6 flex gap-2">
              <Button variant="outline" size="sm" className="border-slate-600 text-white hover:bg-slate-700">
                4-4-2
              </Button>
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-400 hover:bg-slate-700">
                4-3-3
              </Button>
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-400 hover:bg-slate-700">
                3-5-2
              </Button>
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-400 hover:bg-slate-700">
                4-2-3-1
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
