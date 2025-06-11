import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./databaseStorage";
import { insertMealSchema, insertMealPlanSchema, insertActivitySchema, insertShoppingListSchema, insertShoppingItemSchema, loginSchema, registerSchema } from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { setupAuth, requireAuth, requireRole, loadUser, registerUser, authenticateUser, type AuthenticatedRequest } from "./auth";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  setupAuth(app);
  app.use(loadUser);

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      req.session.userId = user.id;
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, role } = req.body;
      const user = await registerUser(email, password, name, role);
      
      req.session.userId = user.id;
      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, (req: AuthenticatedRequest, res) => {
    res.json(req.user);
  });

  // Users routes (protected)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, avatar, preferences } = req.body;
      
      // Check if user exists and has permission to update
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only allow users to update their own profile or parents to update children
      if (req.user!.id !== id && req.user!.role !== "parent") {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const updateData: any = {};
      if (name) updateData.name = name;
      if (avatar) updateData.avatar = avatar;
      if (preferences) updateData.preferences = preferences;
      
      const updatedUser = await storage.updateUser(id, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update user", error: error.message });
    }
  });

  app.post("/api/users", requireAuth, requireRole(["parent"]), async (req, res) => {
    try {
      const { name, email, role = "parent", password = "default123" } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const user = await registerUser(email, password, name, role);
      
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create user", error: error.message });
    }
  });

  // Meals routes - Cook and Parent access
  app.get("/api/meals", requireAuth, requireRole(["parent", "cook"]), async (req, res) => {
    try {
      const meals = await storage.getAllMeals();
      res.json(meals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });

  app.post("/api/meals", requireAuth, requireRole(["parent", "cook"]), async (req, res) => {
    try {
      const validatedData = insertMealSchema.parse(req.body);
      const createdBy = req.body.createdBy || 1; // Default to first user
      const meal = await storage.createMeal(validatedData, createdBy);
      res.status(201).json(meal);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid meal data", error: error.message });
    }
  });

  // AI meal suggestions using Gemini - Cook and Parent access
  app.post("/api/meals/suggestions", requireAuth, requireRole(["parent", "cook"]), async (req, res) => {
    try {
      const { cuisines = [], dietary = [], mealType = "dinner" } = req.body;
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Generate 5 ${mealType} meal suggestions with the following preferences:
      - Cuisines: ${cuisines.join(", ") || "any"}
      - Dietary restrictions: ${dietary.join(", ") || "none"}
      
      For each meal, provide:
      - name: string
      - description: string (brief)
      - cuisine: string
      - ingredients: array of strings
      - instructions: string (brief cooking instructions)
      - prepTimeMinutes: number
      - servings: number (default 4)
      
      Return ONLY valid JSON in this exact format:
      {
        "meals": [
          {
            "name": "Meal Name",
            "description": "Brief description",
            "cuisine": "Cuisine Type",
            "ingredients": ["ingredient1", "ingredient2"],
            "instructions": "Brief cooking instructions",
            "prepTimeMinutes": 30,
            "servings": 4
          }
        ]
      }`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      
      const suggestions = JSON.parse(jsonMatch[0]);
      res.json(suggestions.meals || suggestions);
    } catch (error: any) {
      console.error("AI meal suggestion error:", error);
      res.status(500).json({ message: "Failed to generate meal suggestions", error: error.message });
    }
  });

  // Meal plans routes - Cook and Parent access
  app.get("/api/meal-plans", requireAuth, requireRole(["parent", "cook"]), async (req, res) => {
    try {
      const { userId, date } = req.query;
      let mealPlans;
      
      if (userId) {
        mealPlans = await storage.getMealPlansByUser(parseInt(userId as string));
      } else if (date) {
        mealPlans = await storage.getMealPlansByDate(date as string);
      } else {
        // Get all meal plans for the current week (Monday to Sunday)
        const today = new Date();
        const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
        const week = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(monday);
          date.setDate(monday.getDate() + i);
          const plans = await storage.getMealPlansByDate(date.toISOString().split('T')[0]);
          week.push(...plans);
        }
        mealPlans = week;
      }
      
      // Enrich with meal data
      const enrichedPlans = await Promise.all(
        mealPlans.map(async (plan) => {
          const meal = await storage.getMeal(plan.mealId!);
          return { ...plan, meal };
        })
      );
      
      res.json(enrichedPlans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  app.post("/api/meal-plans", requireAuth, requireRole(["parent", "cook"]), async (req, res) => {
    try {
      const validatedData = insertMealPlanSchema.parse(req.body);
      const mealPlan = await storage.createMealPlan(validatedData);
      res.status(201).json(mealPlan);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid meal plan data", error: error.message });
    }
  });

  app.put("/api/meal-plans/:id", requireAuth, requireRole(["parent", "cook"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const mealPlan = await storage.updateMealPlan(id, updates);
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      res.json(mealPlan);
    } catch (error) {
      res.status(400).json({ message: "Failed to update meal plan" });
    }
  });

  app.delete("/api/meal-plans/:id", requireAuth, requireRole(["parent", "cook"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMealPlan(id);
      if (!deleted) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete meal plan" });
    }
  });

  // Activities routes - Child and Parent access
  app.get("/api/activities", requireAuth, requireRole(["parent", "child"]), async (req, res) => {
    try {
      const { userId, date } = req.query;
      let activities;
      
      if (userId) {
        activities = await storage.getActivitiesByUser(parseInt(userId as string));
      } else if (date) {
        activities = await storage.getActivitiesByDate(date as string);
      } else {
        activities = await storage.getAllActivities();
      }
      
      // Enrich with user data
      const enrichedActivities = await Promise.all(
        activities.map(async (activity) => {
          const assignedUser = activity.assignedTo ? await storage.getUser(activity.assignedTo) : null;
          const createdByUser = activity.createdBy ? await storage.getUser(activity.createdBy) : null;
          return { ...activity, assignedUser, createdByUser };
        })
      );
      
      res.json(enrichedActivities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", requireAuth, requireRole(["parent"]), async (req, res) => {
    try {
      // Convert string dates to Date objects before validation
      const activityData = {
        ...req.body,
        startTime: new Date(req.body.startTime),
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
      };
      
      const validatedData = insertActivitySchema.parse(activityData);
      const createdBy = req.body.createdBy || 1;
      const activity = await storage.createActivity(validatedData, createdBy);
      res.status(201).json(activity);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid activity data", error: error.message });
    }
  });

  app.put("/api/activities/:id", requireAuth, requireRole(["parent"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const activity = await storage.updateActivity(id, updates);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      res.status(400).json({ message: "Failed to update activity" });
    }
  });

  app.delete("/api/activities/:id", requireAuth, requireRole(["parent"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteActivity(id);
      if (!deleted) {
        return res.status(404).json({ message: "Activity not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });

  // Shopping lists routes - All roles can access
  app.get("/api/shopping-lists", requireAuth, async (req, res) => {
    try {
      const lists = await storage.getAllShoppingLists();
      
      // Enrich with items
      const enrichedLists = await Promise.all(
        lists.map(async (list) => {
          const items = await storage.getShoppingItemsByList(list.id);
          return { ...list, items };
        })
      );
      
      res.json(enrichedLists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shopping lists" });
    }
  });

  app.post("/api/shopping-lists", requireAuth, requireRole(["parent", "cook"]), async (req, res) => {
    try {
      const validatedData = insertShoppingListSchema.parse(req.body);
      const createdBy = req.body.createdBy || 1;
      const list = await storage.createShoppingList(validatedData, createdBy);
      res.status(201).json(list);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid shopping list data", error: error.message });
    }
  });

  app.delete("/api/shopping-lists/:id", requireAuth, requireRole(["parent", "cook"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteShoppingList(id);
      if (!deleted) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shopping list" });
    }
  });

  // Generate shopping list from meal plans - Cook and Parent access
  app.post("/api/shopping-lists/generate", requireAuth, requireRole(["parent", "cook"]), async (req, res) => {
    try {
      const { startDate, endDate, userId = 1 } = req.body;
      
      // Get meal plans for date range
      const mealPlans = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const plans = await storage.getMealPlansByDate(dateStr);
        mealPlans.push(...plans);
      }
      
      // Collect ingredients from all planned meals
      const allIngredients = new Set<string>();
      for (const plan of mealPlans) {
        const meal = await storage.getMeal(plan.mealId!);
        if (meal && meal.ingredients) {
          meal.ingredients.forEach(ingredient => allIngredients.add(ingredient));
        }
      }
      
      // Create shopping list
      const listName = `Shopping List ${startDate} to ${endDate}`;
      const shoppingList = await storage.createShoppingList({ name: listName }, userId);
      
      // Add items to the list
      const items = [];
      for (const ingredient of Array.from(allIngredients)) {
        const item = await storage.createShoppingItem({
          listId: shoppingList.id,
          name: ingredient,
          category: "ingredient",
          completed: false
        }, userId);
        items.push(item);
      }
      
      res.status(201).json({ ...shoppingList, items });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate shopping list" });
    }
  });

  // Generate shopping list from specific meals using AI
  app.post("/api/shopping-lists/generate-from-meals", async (req, res) => {
    try {
      const { mealIds, userId = 1 } = req.body;
      
      if (!mealIds || !Array.isArray(mealIds) || mealIds.length === 0) {
        return res.status(400).json({ message: "Meal IDs are required" });
      }
      
      // Get meals
      const meals = [];
      for (const mealId of mealIds) {
        const meal = await storage.getMeal(mealId);
        if (meal) meals.push(meal);
      }
      
      if (meals.length === 0) {
        return res.status(404).json({ message: "No meals found" });
      }
      
      // Use AI to generate a comprehensive shopping list
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const mealDetails = meals.map(meal => 
        `${meal.name}: ${meal.ingredients?.join(", ") || "No ingredients listed"}`
      ).join("\n");
      
      const prompt = `Generate a comprehensive shopping list for these meals:
      ${mealDetails}
      
      Please provide:
      1. All ingredients needed with appropriate quantities for ${meals.length} meals
      2. Group similar items together
      3. Include basic pantry items that might be needed
      4. Consider standard serving sizes
      
      Return ONLY valid JSON in this format:
      {
        "items": [
          {
            "name": "item name",
            "quantity": "amount needed",
            "category": "produce/dairy/meat/pantry/etc"
          }
        ]
      }`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in AI response");
      }
      
      const aiResponse = JSON.parse(jsonMatch[0]);
      
      // Create shopping list
      const mealNames = meals.map(m => m.name).join(", ");
      const listName = `Shopping List for: ${mealNames}`;
      const shoppingList = await storage.createShoppingList({ name: listName }, userId);
      
      // Add AI-generated items to the list
      const items = [];
      for (const aiItem of aiResponse.items || []) {
        const item = await storage.createShoppingItem({
          listId: shoppingList.id,
          name: aiItem.name,
          quantity: aiItem.quantity,
          category: aiItem.category || "general",
          completed: false,
          relatedMeal: mealNames
        }, userId);
        items.push(item);
      }
      
      res.status(201).json({ ...shoppingList, items });
    } catch (error: any) {
      console.error("AI shopping list generation error:", error);
      res.status(500).json({ message: "Failed to generate shopping list with AI", error: error.message });
    }
  });

  // Shopping items routes
  app.post("/api/shopping-items", async (req, res) => {
    try {
      const validatedData = insertShoppingItemSchema.parse(req.body);
      const addedBy = req.body.addedBy || 1;
      const item = await storage.createShoppingItem(validatedData, addedBy);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid shopping item data", error: error.message });
    }
  });

  app.put("/api/shopping-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const item = await storage.updateShoppingItem(id, updates);
      if (!item) {
        return res.status(404).json({ message: "Shopping item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update shopping item" });
    }
  });

  app.delete("/api/shopping-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteShoppingItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Shopping item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shopping item" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
