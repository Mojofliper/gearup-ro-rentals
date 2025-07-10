import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  ArrowLeft, Plus, Edit, Trash2, Eye, Calendar, MapPin, Star, 
  Package, AlertCircle, CheckCircle, Clock, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserListings } from '@/hooks/useUserData';
import { useDeleteGear } from '@/hooks/useGear';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export const MyListings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: myGear, isLoading, error, refetch } = useUserListings();
  const { mutate: deleteGear, isPending: isDeleting } = useDeleteGear();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gearToDelete, setGearToDelete] = useState<Record<string, unknown> | null>(null);

  const handleEditGear = (gear: Record<string, unknown>) => {
    // Navigate to edit gear page (you might need to create this)
    navigate(`/edit-gear/${gear.id}`);
  };

  const handleViewGear = (gear: Record<string, unknown>) => {
    navigate(`/gear/${gear.id}`);
  };

  const handleDeleteClick = (gear: Record<string, unknown>) => {
    setGearToDelete(gear);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!gearToDelete) return;

    deleteGear(gearToDelete.id as string, {
      onSuccess: () => {
        toast({
          title: 'Echipament șters',
          description: 'Echipamentul a fost șters cu succes.',
        });
        setDeleteDialogOpen(false);
        setGearToDelete(null);
        refetch();
      },
      onError: (error: unknown) => {
        toast({
          title: 'Eroare',
          description: 'Nu s-a putut șterge echipamentul. Încearcă din nou.',
          variant: 'destructive',
        });
        console.error('Delete error:', error);
      }
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Disponibil</Badge>;
      case 'rented':
        return <Badge className="bg-blue-100 text-blue-800">Închiriat</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-100 text-yellow-800">În mentenanță</Badge>;
      default:
        return <Badge variant="secondary">Indisponibil</Badge>;
    }
  };

  const getModerationBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Aprobat</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">În așteptare</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Respins</Badge>;
      default:
        return <Badge variant="secondary">Necunoscut</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            <span className="ml-2 text-sm sm:text-base text-blue-500">Se încarcă echipamentele...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="text-center py-8 sm:py-12">
            <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Eroare la încărcare</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">Nu s-au putut încărca echipamentele tale.</p>
            <Button onClick={() => refetch()}>Încearcă din nou</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="w-fit">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Înapoi la Dashboard
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Echipamentele mele</h1>
              <p className="text-sm sm:text-base text-gray-600">Gestionează echipamentele tale pentru închiriere</p>
            </div>
          </div>
          <Button onClick={() => navigate('/add-gear')} className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Adaugă echipament
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total echipamente</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{myGear?.length || 0}</p>
                </div>
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Disponibile</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">
                    {myGear?.filter(gear => gear.status === 'available').length || 0}
                  </p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Închiriate</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">
                    {myGear?.filter(gear => gear.status === 'rented').length || 0}
                  </p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">În așteptare</p>
                  <p className="text-lg sm:text-2xl font-bold text-yellow-600">
                    {myGear?.filter(gear => gear.moderation_status === 'pending').length || 0}
                  </p>
                </div>
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gear Listings */}
        {myGear && myGear.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {myGear.map((gear) => (
              <Card key={String(gear.id)} className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base sm:text-lg text-gray-900 line-clamp-2">
                        {gear.title as string}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2">
                        {getStatusBadge(gear.status as string)}
                        {getModerationBadge(gear.moderation_status as string)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 sm:space-y-4">
                  {/* Gear Image */}
                  <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                    {gear.gear_photos && Array.isArray(gear.gear_photos) && gear.gear_photos.length > 0 ? (
                      <img
                        src={gear.gear_photos[0].photo_url as string}
                        alt={gear.title as string}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Gear Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xl sm:text-2xl font-bold text-blue-600">
                        {formatPrice(Number(gear.price_per_day))}
                      </span>
                      <span className="text-gray-500 text-xs sm:text-sm">pe zi</span>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">{gear.pickup_location as string || 'Locație necunoscută'}</span>
                    </div>
                    
                    {gear.view_count && (
                      <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-500">
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{Number(gear.view_count)} vizualizări</span>
                      </div>
                    )}
                    
                    <div className="text-xs sm:text-sm text-gray-500">
                      Adăugat pe {format(new Date(gear.created_at as string), 'dd MMM yyyy')}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewGear(gear)}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Vezi
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditGear(gear)}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Editează
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(gear)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-8 sm:p-12 text-center">
              <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Nu ai echipamente încă</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Începe să câștigi bani închiriind echipamentele tale!
              </p>
              <Button onClick={() => navigate('/add-gear')} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Adaugă primul echipament
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Șterge echipament</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Ești sigur că vrei să ștergi "{gearToDelete?.title as string}"? Această acțiune nu poate fi anulată.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se șterge...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Șterge
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 