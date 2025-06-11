import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShoppingCart, Plus, Download, Trash2, Sparkles, ChefHat } from "lucide-react";
import { EnrichedShoppingList } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function ShoppingListComponent() {
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [showMealSelector, setShowMealSelector] = useState(false);
  const [selectedMeals, setSelectedMeals] = useState<number[]>([]);
  const [isGeneratingFromMeals, setIsGeneratingFromMeals] = useState(false);
  const { toast } = useToast();

  const { data: shoppingLists, isLoading } = useQuery<EnrichedShoppingList[]>({
    queryKey: ["/api/shopping-lists"],
  });

  const { data: availableMeals = [] } = useQuery<any[]>({
    queryKey: ["/api/meals"],
  });

  const createListMutation = useMutation({
    mutationFn: async () => {
      const listName = `Shopping List - ${new Date().toLocaleDateString()}`;
      return apiRequest("POST", "/api/shopping-lists", { name: listName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      toast({
        title: "Success",
        description: "New shopping list created!"
      });
    }
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ listId, name, quantity }: { listId: number; name: string; quantity?: string }) => {
      return apiRequest("POST", "/api/shopping-items", {
        listId,
        name,
        quantity,
        category: "manual",
        completed: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      setNewItemName("");
      setNewItemQuantity("");
      toast({
        title: "Success",
        description: "Item added to shopping list!"
      });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      return apiRequest("PUT", `/api/shopping-items/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
    }
  });

  const generateListMutation = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      return apiRequest("POST", "/api/shopping-lists/generate", {
        startDate: today.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        userId: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      toast({
        title: "Success",
        description: "Shopping list generated from meal plans!"
      });
    }
  });

  const generateFromMealsMutation = useMutation({
    mutationFn: async (mealIds: number[]) => {
      return apiRequest("POST", "/api/shopping-lists/generate-from-meals", {
        mealIds,
        userId: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      setShowMealSelector(false);
      setSelectedMeals([]);
      toast({
        title: "Success",
        description: "Shopping list generated from selected meals!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate shopping list from meals",
        variant: "destructive"
      });
    }
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: number) => {
      return apiRequest("DELETE", `/api/shopping-lists/${listId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      toast({
        title: "Success",
        description: "Shopping list deleted!"
      });
    }
  });

  const handleMealSelection = (mealId: number) => {
    setSelectedMeals(prev => 
      prev.includes(mealId) 
        ? prev.filter(id => id !== mealId)
        : [...prev, mealId]
    );
  };

  const handleGenerateFromMeals = async () => {
    if (selectedMeals.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one meal",
        variant: "destructive"
      });
      return;
    }
    
    setIsGeneratingFromMeals(true);
    try {
      await generateFromMealsMutation.mutateAsync(selectedMeals);
    } catch (error) {
      // Error handling is done in the mutation
    } finally {
      setIsGeneratingFromMeals(false);
    }
  };

  const handleAddItem = (listId: number) => {
    if (!newItemName.trim()) return;
    
    addItemMutation.mutate({
      listId,
      name: newItemName.trim(),
      quantity: newItemQuantity.trim() || undefined
    });
  };

  const handleToggleItem = (itemId: number, completed: boolean) => {
    updateItemMutation.mutate({ id: itemId, completed });
  };

  const exportList = (list: EnrichedShoppingList) => {
    const content = `${list.name}\n\n${list.items.map(item => 
      `${item.completed ? '✓' : '□'} ${item.name}${item.quantity ? ` (${item.quantity})` : ''}`
    ).join('\n')}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${list.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Shopping Lists</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateListMutation.mutate()}
                disabled={generateListMutation.isPending}
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                {generateListMutation.isPending ? "Generating..." : "Generate from Planned Meals"}
              </Button>
              <Dialog open={showMealSelector} onOpenChange={setShowMealSelector}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg transition-all"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Generate from Meals
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <ChefHat className="w-5 h-5" />
                      <span>Select Meals for Shopping List</span>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {availableMeals.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ChefHat className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No meals available</p>
                        <p className="text-sm">Add some meals first to generate shopping lists</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                        {availableMeals.map((meal: any) => (
                          <div
                            key={meal.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                              selectedMeals.includes(meal.id)
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                            onClick={() => handleMealSelection(meal.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <Checkbox
                                checked={selectedMeals.includes(meal.id)}
                                onChange={() => handleMealSelection(meal.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{meal.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{meal.description}</p>
                                {meal.cuisine && (
                                  <Badge variant="outline" className="mt-2 text-xs">
                                    {meal.cuisine}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        {selectedMeals.length} meal{selectedMeals.length !== 1 ? 's' : ''} selected
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowMealSelector(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleGenerateFromMeals}
                          disabled={selectedMeals.length === 0 || isGeneratingFromMeals}
                          className="bg-gradient-to-r from-primary to-secondary"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          {isGeneratingFromMeals ? "Generating..." : "Generate Shopping List"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                size="sm"
                onClick={() => createListMutation.mutate()}
                disabled={createListMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-1" />
                New List
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!shoppingLists || shoppingLists.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No shopping lists yet</p>
              <p className="text-sm">Create a new list or generate one from your meal plans</p>
            </div>
          ) : (
            <div className="space-y-4">
              {shoppingLists.map((list) => (
                <Card key={list.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{list.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {list.items.length} items
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {list.items.filter(item => item.completed).length} completed
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportList(list)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Export
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteListMutation.mutate(list.id)}
                          disabled={deleteListMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex space-x-2 mb-4">
                      <Input
                        placeholder="Add item..."
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddItem(list.id)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Qty"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddItem(list.id)}
                        className="w-20"
                      />
                      <Button
                        onClick={() => handleAddItem(list.id)}
                        disabled={!newItemName.trim() || addItemMutation.isPending}
                        size="sm"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {list.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center space-x-3 p-2 rounded-lg border ${
                            item.completed ? "bg-gray-50 text-gray-500" : "bg-white"
                          }`}
                        >
                          <Checkbox
                            checked={item.completed || false}
                            onCheckedChange={(checked) => handleToggleItem(item.id, checked as boolean)}
                          />
                          <div className="flex-1">
                            <span className={item.completed ? "line-through" : ""}>{item.name}</span>
                            {item.quantity && (
                              <span className="text-sm text-gray-500 ml-2">({item.quantity})</span>
                            )}
                          </div>
                          {item.category && (
                            <Badge variant="secondary" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}