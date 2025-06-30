
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Calendar, MessageSquare, Camera } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Caută echipamentul',
    description: 'Browsează prin sute de echipamente foto, video și audio din orașul tău',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
  },
  {
    icon: Calendar,
    title: 'Rezervă perioada',
    description: 'Selectează datele când ai nevoie de echipament și verifică disponibilitatea',
    color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
  },
  {
    icon: MessageSquare,
    title: 'Comunică cu proprietarul',
    description: 'Stabilește detaliile de preluare și returnare prin mesajele sigure',
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
  },
  {
    icon: Camera,
    title: 'Creează conținut amazing',
    description: 'Folosește echipamentul pentru proiectele tale și returnează-l la timp',
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400'
  }
];

export const HowItWorks: React.FC = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Cum funcționează</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            În doar 4 pași simpli poți începe să închiriezi echipamentul de care ai nevoie
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className={`w-16 h-16 rounded-full ${step.color} flex items-center justify-center mx-auto mb-4`}>
                  <step.icon className="h-8 w-8" />
                </div>
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-3">De ce să alegi GearUp?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong className="text-green-600">✓ Securitate</strong>
                <p className="text-muted-foreground">Plăți sigure și verificarea identității</p>
              </div>
              <div>
                <strong className="text-blue-600">✓ Local</strong>
                <p className="text-muted-foreground">Echipamente din orașul tău</p>
              </div>
              <div>
                <strong className="text-purple-600">✓ Comunitate</strong>
                <p className="text-muted-foreground">Creatori români care se ajută între ei</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
