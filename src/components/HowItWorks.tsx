import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Calendar,
  Shield,
  CreditCard,
  Camera,
  Users,
  Star,
  CheckCircle,
  ArrowRight,
  Zap,
  Lock,
  Heart,
} from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Caută echipamentul",
    description:
      "Filtrează după tip, preț, locație și disponibilitate. Găsește exact ce ai nevoie.",
    color: "from-blue-600 to-indigo-600",
    bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50",
    iconColor: "text-blue-600",
  },
  {
    icon: Calendar,
    title: "Rezervă perioada",
    description:
      "Alege data de început și sfârșit. Verifică disponibilitatea în timp real.",
    color: "from-indigo-600 to-purple-600",
    bgColor: "bg-gradient-to-br from-indigo-50 to-purple-50",
    iconColor: "text-indigo-600",
  },
  {
    icon: CreditCard,
    title: "Plătește în siguranță",
    description:
      "Tranzacție securizată prin Stripe. Banii sunt ținuți în escrow până la confirmare.",
    color: "from-purple-600 to-blue-600",
    bgColor: "bg-gradient-to-br from-purple-50 to-blue-50",
    iconColor: "text-purple-600",
  },
  {
    icon: Camera,
    title: "Închiriază și folosește",
    description:
      "Întâlnește proprietarul, verifică echipamentul și începe să creezi.",
    color: "from-blue-600 to-sky-600",
    bgColor: "bg-gradient-to-br from-blue-50 to-sky-50",
    iconColor: "text-sky-600",
  },
];

const features = [
  {
    icon: Shield,
    title: "Protecție completă",
    description: "Asigurare și verificare echipament la predare și primire",
    color: "bg-gradient-to-br from-blue-50 to-indigo-50",
    iconColor: "text-blue-600",
  },
  {
    icon: Users,
    title: "Comunitate verificată",
    description: "Toți utilizatorii sunt verificați cu documente de identitate",
    color: "bg-gradient-to-br from-indigo-50 to-purple-50",
    iconColor: "text-indigo-600",
  },
  {
    icon: Star,
    title: "Sistem de recenzii",
    description: "Evaluează și fii evaluat pentru experiențe mai bune",
    color: "bg-gradient-to-br from-amber-50 to-orange-50",
    iconColor: "text-amber-600",
  },
  {
    icon: Lock,
    title: "Plăți securizate",
    description: "Tranzacții criptate prin Stripe cu protecție escrow",
    color: "bg-gradient-to-br from-green-50 to-emerald-50",
    iconColor: "text-green-600",
  },
  {
    icon: Zap,
    title: "Proces rapid",
    description: "De la căutare la închiriere în câteva minute",
    color: "bg-gradient-to-br from-sky-50 to-blue-50",
    iconColor: "text-sky-600",
  },
  {
    icon: Heart,
    title: "Suport dedicat",
    description: "Echipa noastră te ajută la fiecare pas",
    color: "bg-gradient-to-br from-pink-50 to-rose-50",
    iconColor: "text-pink-600",
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center mb-20">
          <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-full font-medium mb-6">
            <CheckCircle className="h-4 w-4 mr-2" />
            Proces simplu și sigur
          </Badge>

          <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Cum funcționează
          </h2>

          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            În doar 4 pași simpli, poți închiria echipament profesional de la
            creatorii români
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {steps.map((step, index) => (
            <Card
              key={index}
              className="group hover:shadow-xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm"
            >
              <CardContent className="p-8 text-center relative">
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                </div>

                {/* Icon */}
                <div
                  className={`w-20 h-20 ${step.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                >
                  <step.icon className={`h-10 w-10 ${step.iconColor}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
                  {step.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">
              De ce să alegi GearUp?
            </h3>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Platforma noastră oferă tot ce ai nevoie pentru o experiență de
              închiriere sigură și plăcută
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm"
              >
                <CardContent className="p-6">
                  <div
                    className={`w-16 h-16 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className={`h-8 w-8 ${feature.iconColor}`} />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                    {feature.title}
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-12 max-w-4xl mx-auto border border-blue-200">
            <h3 className="text-3xl font-bold text-slate-900 mb-6">
              Gata să începi?
            </h3>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Alătură-te comunității de creatorii români și descoperă
              echipamente profesionale la prețuri accesibile
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => (window.location.href = "/browse")}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Search className="h-5 w-5 mr-2" />
                Caută echipamente
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>

              <Button
                onClick={() => (window.location.href = "/add-gear")}
                variant="outline"
                size="lg"
                className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300"
              >
                <Camera className="h-5 w-5 mr-2" />
                Adaugă echipament
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
