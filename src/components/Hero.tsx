
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Search, Camera, Users, Shield, Sparkles, ArrowRight, Play } from 'lucide-react';

const romanianCounties = ['Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brăila', 'Brașov', 'București', 'Buzău', 'Călărași', 'Caraș-Severin', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vâlcea', 'Vaslui', 'Vrancea'];

export const Hero: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    navigate(`/browse?search=${searchQuery}&location=${location}`);
  };

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>

      <div className="relative container mx-auto px-4 py-20 sm:py-32">
        <div className="max-w-6xl mx-auto">
          {/* Hero Content */}
          <div className="text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
              <Sparkles className="h-4 w-4 text-yellow-400 mr-2" />
              <span className="text-white/90 text-sm font-medium">Platforma #1 pentru închirieri echipamente foto-video</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Închiriază echipamente
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                foto-video în siguranță
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              Conectează-te cu creatorii români. Închiriază sau oferă spre închiriere echipament profesional cu protecție completă.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button 
                onClick={() => navigate('/browse')}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
              >
                <Search className="h-5 w-5 mr-2" />
                Caută echipamente
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              
              <Button 
                onClick={() => navigate('/add-gear')}
                variant="outline"
                size="lg"
                className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300"
              >
                <Camera className="h-5 w-5 mr-2" />
                Adaugă echipament
              </Button>
            </div>

            {/* Video Preview */}
            <div className="flex items-center justify-center mb-16">
              <div className="relative group cursor-pointer">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <Play className="h-8 w-8 text-white ml-1" />
                </div>
                <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/20 shadow-2xl">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Caută echipament (ex: Sony A7 III, drone, obiectiv...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/90 border-0 text-gray-900 placeholder-gray-600 rounded-xl px-6 py-4 text-lg focus:ring-2 focus:ring-purple-500 focus:bg-white"
                  />
                </div>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="w-full lg:w-48 bg-white/90 border-0 text-gray-900 rounded-xl px-6 py-4 text-lg focus:ring-2 focus:ring-purple-500 focus:bg-white">
                    <SelectValue placeholder="Județ" />
                  </SelectTrigger>
                  <SelectContent>
                    {romanianCounties.map((county) => (
                      <SelectItem key={county} value={county}>
                        {county}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleSearch} 
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Caută
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Camera className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl sm:text-4xl font-bold text-white mb-2">500+</h3>
              <p className="text-white/80 text-lg">Echipamente disponibile</p>
            </div>
            <div className="text-center group">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Users className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl sm:text-4xl font-bold text-white mb-2">1,200+</h3>
              <p className="text-white/80 text-lg">Creatori înregistrați</p>
            </div>
            <div className="text-center group">
              <div className="bg-gradient-to-br from-pink-500 to-red-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl sm:text-4xl font-bold text-white mb-2">100%</h3>
              <p className="text-white/80 text-lg">Tranzacții securizate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};
