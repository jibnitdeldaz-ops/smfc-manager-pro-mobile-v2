import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Zap, BarChart3, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 sm:pb-32 sm:pt-24 lg:px-8 lg:pt-32">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              SMFC Manager
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300 sm:text-xl">
              Real-time Squad Management for Modern Football Teams
            </p>
            <p className="mt-4 text-base leading-7 text-slate-400 sm:text-lg">
              Manage your squad, analyze tactics, and make data-driven decisions all in one powerful platform.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/dashboard">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                  Get Started
                </Button>
              </Link>
              <Link href="/dashboard/tactics">
                <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
                  View Tactical Board
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to manage your squad
          </h2>
          <p className="mt-2 text-lg leading-8 text-slate-400">
            Powerful features designed for coaches, managers, and analysts.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-600/20">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <CardTitle className="text-white">Real-time Squad Management</CardTitle>
              <CardDescription className="text-slate-400">
                Track player availability, positions, and performance metrics in real-time.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/20">
                <Zap className="h-6 w-6 text-blue-400" />
              </div>
              <CardTitle className="text-white">Tactical Board</CardTitle>
              <CardDescription className="text-slate-400">
                Visualize formations, set pieces, and tactical strategies on an interactive pitch.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600/20">
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Advanced Analytics</CardTitle>
              <CardDescription className="text-slate-400">
                Deep insights into player performance, team statistics, and match analysis.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-600/20">
                <Shield className="h-6 w-6 text-orange-400" />
              </div>
              <CardTitle className="text-white">Team Coordination</CardTitle>
              <CardDescription className="text-slate-400">
                Seamless communication and coordination tools for your entire coaching staff.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform your squad management?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400">
              Start managing your team more effectively today. No credit card required.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/dashboard">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                  Launch Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
