import {
  users, meals, mealPlans, activities, shoppingLists, shoppingItems,
  type User, type InsertUser, type Meal, type InsertMeal,
  type MealPlan, type InsertMealPlan, type Activity, type InsertActivity,
  type ShoppingList, type InsertShoppingList, type ShoppingItem, type InsertShoppingItem
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  authenticateUser(email: string, password: string): Promise<User | null>;
  
  // Meal operations
  getMeal(id: number): Promise<Meal | undefined>;
  getAllMeals(): Promise<Meal[]>;
  createMeal(meal: InsertMeal, createdBy: number): Promise<Meal>;
  getMealsByCreator(userId: number): Promise<Meal[]>;
  
  // Meal plan operations
  getMealPlan(id: number): Promise<MealPlan | undefined>;
  getMealPlansByUser(userId: number): Promise<MealPlan[]>;
  getMealPlansByDate(date: string): Promise<MealPlan[]>;
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  updateMealPlan(id: number, updates: Partial<MealPlan>): Promise<MealPlan | undefined>;
  deleteMealPlan(id: number): Promise<boolean>;
  
  // Activity operations
  getActivity(id: number): Promise<Activity | undefined>;
  getAllActivities(): Promise<Activity[]>;
  getActivitiesByUser(userId: number): Promise<Activity[]>;
  getActivitiesByDate(date: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity, createdBy: number): Promise<Activity>;
  updateActivity(id: number, updates: Partial<Activity>): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<boolean>;
  
  // Shopping list operations
  getShoppingList(id: number): Promise<ShoppingList | undefined>;
  getAllShoppingLists(): Promise<ShoppingList[]>;
  getShoppingListsByUser(userId: number): Promise<ShoppingList[]>;
  createShoppingList(list: InsertShoppingList, createdBy: number): Promise<ShoppingList>;
  updateShoppingList(id: number, updates: Partial<ShoppingList>): Promise<ShoppingList | undefined>;
  deleteShoppingList(id: number): Promise<boolean>;
  
  // Shopping item operations
  getShoppingItem(id: number): Promise<ShoppingItem | undefined>;
  getShoppingItemsByList(listId: number): Promise<ShoppingItem[]>;
  createShoppingItem(item: InsertShoppingItem, addedBy: number): Promise<ShoppingItem>;
  updateShoppingItem(id: number, updates: Partial<ShoppingItem>): Promise<ShoppingItem | undefined>;
  deleteShoppingItem(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async authenticateUser(email: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return null;
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    return isValidPassword ? user : null;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    if (!result || result.length === 0) {
      throw new Error("Failed to create user");
    }
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Meal operations
  async getMeal(id: number): Promise<Meal | undefined> {
    const [meal] = await db.select().from(meals).where(eq(meals.id, id));
    return meal || undefined;
  }

  async getAllMeals(): Promise<Meal[]> {
    return await db.select().from(meals);
  }

  async createMeal(insertMeal: InsertMeal, createdBy: number): Promise<Meal> {
    const [meal] = await db.insert(meals).values({ ...insertMeal, createdBy }).returning();
    return meal;
  }

  async getMealsByCreator(userId: number): Promise<Meal[]> {
    return await db.select().from(meals).where(eq(meals.createdBy, userId));
  }

  // Meal plan operations
  async getMealPlan(id: number): Promise<MealPlan | undefined> {
    const [plan] = await db.select().from(mealPlans).where(eq(mealPlans.id, id));
    return plan || undefined;
  }

  async getMealPlansByUser(userId: number): Promise<MealPlan[]> {
    return await db.select().from(mealPlans).where(eq(mealPlans.userId, userId));
  }

  async getMealPlansByDate(date: string): Promise<MealPlan[]> {
    return await db.select().from(mealPlans).where(eq(mealPlans.plannedDate, date));
  }

  async createMealPlan(insertMealPlan: InsertMealPlan): Promise<MealPlan> {
    const [plan] = await db.insert(mealPlans).values(insertMealPlan).returning();
    return plan;
  }

  async updateMealPlan(id: number, updates: Partial<MealPlan>): Promise<MealPlan | undefined> {
    const [plan] = await db.update(mealPlans).set(updates).where(eq(mealPlans.id, id)).returning();
    return plan || undefined;
  }

  async deleteMealPlan(id: number): Promise<boolean> {
    const result = await db.delete(mealPlans).where(eq(mealPlans.id, id));
    return typeof result.rowCount === 'number' && result.rowCount > 0;
  }

  // Activity operations
  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async getAllActivities(): Promise<Activity[]> {
    return await db.select().from(activities);
  }

  async getActivitiesByUser(userId: number): Promise<Activity[]> {
    return await db.select().from(activities).where(eq(activities.assignedTo, userId));
  }

  async getActivitiesByDate(date: string): Promise<Activity[]> {
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');
    return await db.select().from(activities).where(
      sql`${activities.startTime} >= ${startOfDay} AND ${activities.startTime} <= ${endOfDay}`
    );
  }

  async createActivity(insertActivity: InsertActivity, createdBy: number): Promise<Activity> {
    const [activity] = await db.insert(activities).values({ ...insertActivity, createdBy }).returning();
    return activity;
  }

  async updateActivity(id: number, updates: Partial<Activity>): Promise<Activity | undefined> {
    const [activity] = await db.update(activities).set(updates).where(eq(activities.id, id)).returning();
    return activity || undefined;
  }

  async deleteActivity(id: number): Promise<boolean> {
    const result = await db.delete(activities).where(eq(activities.id, id));
    return typeof result.rowCount === 'number' && result.rowCount > 0;
  }

  // Shopping list operations
  async getShoppingList(id: number): Promise<ShoppingList | undefined> {
    const [list] = await db.select().from(shoppingLists).where(eq(shoppingLists.id, id));
    return list || undefined;
  }

  async getAllShoppingLists(): Promise<ShoppingList[]> {
    return await db.select().from(shoppingLists);
  }

  async getShoppingListsByUser(userId: number): Promise<ShoppingList[]> {
    return await db.select().from(shoppingLists).where(eq(shoppingLists.createdBy, userId));
  }

  async createShoppingList(insertList: InsertShoppingList, createdBy: number): Promise<ShoppingList> {
    const [list] = await db.insert(shoppingLists).values({ ...insertList, createdBy }).returning();
    return list;
  }

  async updateShoppingList(id: number, updates: Partial<ShoppingList>): Promise<ShoppingList | undefined> {
    const [list] = await db.update(shoppingLists).set(updates).where(eq(shoppingLists.id, id)).returning();
    return list || undefined;
  }

  async deleteShoppingList(id: number): Promise<boolean> {
    const result = await db.delete(shoppingLists).where(eq(shoppingLists.id, id));
    return typeof result.rowCount === 'number' && result.rowCount > 0;
  }

  // Shopping item operations
  async getShoppingItem(id: number): Promise<ShoppingItem | undefined> {
    const [item] = await db.select().from(shoppingItems).where(eq(shoppingItems.id, id));
    return item || undefined;
  }

  async getShoppingItemsByList(listId: number): Promise<ShoppingItem[]> {
    return await db.select().from(shoppingItems).where(eq(shoppingItems.listId, listId));
  }

  async createShoppingItem(insertItem: InsertShoppingItem, addedBy: number): Promise<ShoppingItem> {
    const [item] = await db.insert(shoppingItems).values({ ...insertItem, addedBy }).returning();
    return item;
  }

  async updateShoppingItem(id: number, updates: Partial<ShoppingItem>): Promise<ShoppingItem | undefined> {
    const [item] = await db.update(shoppingItems).set(updates).where(eq(shoppingItems.id, id)).returning();
    return item || undefined;
  }

  async deleteShoppingItem(id: number): Promise<boolean> {
    const result = await db.delete(shoppingItems).where(eq(shoppingItems.id, id));
    return typeof result.rowCount === 'number' && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();