// /lib/storage.ts

import {
  users,
  clients,
  projects,
  timesheets,
  projectRoleTypes,
  projectResources,
  resourcePlanning,
  organizations,
  notifications,
  resourceForecasts,
  type User,
  type UpsertUser,
  type InsertClient,
  type Client,
  type InsertProject,
  type Project,
  type ProjectWithRelations,
  type ProjectResourceWithRelations,
  type InsertTimesheet,
  type Timesheet,
  type TimesheetWithRelations,
  type ProjectRoleType,
  type InsertProjectRoleType,
  type ProjectResource,
  type InsertProjectResource,
  type ResourcePlanning,
  type InsertResourcePlanning,
  type Organization,
  type InsertOrganization,
  type Notification,
  type InsertNotification,
  type ResourceForecast,
  type InsertResourceForecast,
  changeOrders,
  projectBurn,
  type ChangeOrder,
  type InsertChangeOrder,
  type ProjectBurn,
  type InsertProjectBurn,
} from "@/db/schema";
import { db } from "../lib/db";
import { eq, and, desc, gte, lte, sql, count, sum, ne, lt, gt } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  updateUserPhoto(id: string, customProfileImage: string): Promise<User | undefined>;
  updateUserResourceCost(id: string, resourceCost: number): Promise<User | undefined>;
  
  // User management operations
  createUser(user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    timezone?: string;
    role?: string;
    organizationId?: number;
  }): Promise<{ user: User; password: string }>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserStatus(id: string, isActive: boolean): Promise<User | undefined>;
  deleteUser(id: string): Promise<{ success: boolean; preservedTimesheets: number; preservedNotifications: number }>;
  resetUserPassword(id: string): Promise<{ user: User; password: string }>;
  
  // Organization operations (for multi-tenant configuration)
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, org: Partial<InsertOrganization>): Promise<Organization | undefined>;
  
  // Configuration operations for setting up new client organizations
  setupClientOrganization(config: {
    organization: InsertOrganization;
    adminUser: { email: string; firstName: string; lastName: string; role: string };
    initialUsers?: Array<{ email: string; firstName: string; lastName: string; role: string }>;
    initialClients?: Array<{ name: string; email?: string; contactPerson?: string }>;
  }): Promise<{ organization: Organization; users: User[]; clients: Client[] }>;
  
  // Client operations
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  
  // Project operations
  getProjects(): Promise<ProjectWithRelations[]>;
  getProject(id: number): Promise<ProjectWithRelations | undefined>;
  getProjectsByManager(managerId: string): Promise<ProjectWithRelations[]>;
  getProjectsByUser(userId: string): Promise<ProjectWithRelations[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  
  // Project Role Type operations (rate cards)
  getProjectRoleTypes(projectId: number): Promise<ProjectRoleType[]>;
  createProjectRoleType(roleType: InsertProjectRoleType): Promise<ProjectRoleType>;
  updateProjectRoleType(id: number, roleType: Partial<InsertProjectRoleType>): Promise<ProjectRoleType | undefined>;
  clearProjectRoleTypes(projectId: number): Promise<void>;
  
  // Project Resource operations
  getProjectResources(projectId: number): Promise<ProjectResourceWithRelations[]>;
  createProjectResource(resource: InsertProjectResource): Promise<ProjectResource>;
  updateProjectResource(id: number, resource: Partial<InsertProjectResource>): Promise<ProjectResource | undefined>;
  
  // Resource Planning operations
  getResourcePlanning(projectResourceId: number): Promise<ResourcePlanning[]>;
  createResourcePlanning(planning: InsertResourcePlanning): Promise<ResourcePlanning>;
  updateResourcePlanning(id: number, planning: Partial<InsertResourcePlanning>): Promise<ResourcePlanning | undefined>;
  
  // Timesheet operations (role-based access)
  getTimesheets(userId?: string): Promise<TimesheetWithRelations[]>;
  getTimesheet(id: number): Promise<TimesheetWithRelations | undefined>;
  getTimesheetsByStatus(status: string, projectManagerId?: string): Promise<TimesheetWithRelations[]>;
  getTimesheetsByDateRange(startDate: string, endDate: string, userId?: string): Promise<TimesheetWithRelations[]>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: number, timesheet: Partial<InsertTimesheet>): Promise<Timesheet | undefined>;
  deleteTimesheet(id: number): Promise<boolean>;
  approveTimesheet(id: number, approverId: string): Promise<Timesheet | undefined>;
  rejectTimesheet(id: number, approverId: string, reason: string): Promise<Timesheet | undefined>;
  
  // Analytics operations
  getUserMetrics(userId: string, startDate: string, endDate: string): Promise<any>;
  getProjectMetrics(projectId?: number): Promise<any>;
  getManagerMetrics(managerId: string): Promise<any>;
  
  // Resource Forecast operations
  getResourceForecasts(): Promise<any>;
  createResourceForecast(forecast: InsertResourceForecast): Promise<ResourceForecast>;
  updateResourceForecast(userId: string, projectId: number, weekStarting: string, forecastHours: number): Promise<ResourceForecast | undefined>;
  
  // Change order operations
  createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder>;
  getChangeOrders(projectId: number): Promise<ChangeOrder[]>;
  updateChangeOrderStatus(id: number, status: string): Promise<ChangeOrder | undefined>;

  // Project burn tracking operations
  upsertProjectBurn(burn: InsertProjectBurn): Promise<ProjectBurn>;
  getProjectBurn(projectId: number): Promise<ProjectBurn[]>;
  calculateProjectMetrics(projectId: number): Promise<{
    totalActualHours: number;
    totalActualCost: number;
    totalForecastHours: number;
    totalForecastCost: number;
    budgetRemaining: number;
    projectedOverrun: number;
  }>;
  
  // Notification operations
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  clearNotificationsByType(userId: string, type: string): Promise<void>;
  clearTimesheetNotifications(userId: string, timesheetId?: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserPhoto(id: string, customProfileImage: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ customProfileImage, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserResourceCost(id: string, resourceCost: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ resourceCost: resourceCost.toString(), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // User management operations
  async createUser(user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    timezone?: string;
    role?: string;
    organizationId?: number;
  }): Promise<{ user: User; password: string }> {
    // Generate a secure password
    const password = this.generatePassword();
    const hashedPassword = await this.hashPassword(password);
    
    // Generate unique user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const userData = {
      id: userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      timezone: user.timezone,
      hashedPassword,
      role: (user.role || 'consultant') as any,
      organizationId: user.organizationId,
      isActive: true,
    };

    const [newUser] = await db.insert(users).values(userData).returning();
    return { user: newUser, password };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User | undefined> {
    const updateData: any = { 
      isActive, 
      updatedAt: new Date() 
    };
    
    // Set deactivatedAt when deactivating, clear it when reactivating
    if (!isActive) {
      updateData.deactivatedAt = new Date();
    } else {
      updateData.deactivatedAt = null;
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<{ success: boolean; preservedTimesheets: number; preservedNotifications: number }> {
    // Check if user exists
    const user = await this.getUser(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Count timesheets that will be preserved
    const timesheetCount = await db
      .select({ count: count() })
      .from(timesheets)
      .where(eq(timesheets.userId, id));

    // Count notifications that will be preserved  
    const notificationCount = await db
      .select({ count: count() })
      .from(notifications)
      .where(eq(notifications.userId, id));

    // Delete the user but preserve historical data
    // Timesheets, notifications, and project assignments remain for data integrity
    await db.delete(users).where(eq(users.id, id));

    return {
      success: true,
      preservedTimesheets: timesheetCount[0]?.count || 0,
      preservedNotifications: notificationCount[0]?.count || 0
    };
  }

  async resetUserPassword(id: string): Promise<{ user: User; password: string }> {
    const password = this.generatePassword();
    const hashedPassword = await this.hashPassword(password);
    
    const [updatedUser] = await db
      .update(users)
      .set({ hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return { user: updatedUser, password };
  }

  // Helper methods for password management
  private generatePassword(): string {
    // Generate a password with 3 random words
    const words = [
      'apple', 'banana', 'cherry', 'dog', 'elephant', 'forest', 'guitar', 'house', 'island', 'jungle',
      'kite', 'lemon', 'mountain', 'ocean', 'piano', 'queen', 'river', 'sunset', 'tiger', 'umbrella',
      'village', 'water', 'yellow', 'zebra', 'bridge', 'castle', 'dream', 'eagle', 'flower', 'garden',
      'happy', 'ice', 'jazz', 'knight', 'light', 'magic', 'nature', 'orange', 'peace', 'quick',
      'rocket', 'star', 'tree', 'unique', 'voice', 'wind', 'wonder', 'year', 'zone', 'adventure'
    ];
    
    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const word3 = words[Math.floor(Math.random() * words.length)];
    
    return `${word1}-${word2}-${word3}`;
  }

  private async hashPassword(password: string): Promise<string> {
    // Simple hash for demo - in production use bcrypt
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  // Organization operations for multi-tenant configuration
  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).where(eq(organizations.isActive, true));
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values(org).returning();
    return newOrg;
  }

  async updateOrganization(id: number, org: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [updatedOrg] = await db
      .update(organizations)
      .set({ ...org, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updatedOrg;
  }

  // Configuration method for setting up new client organizations
  async setupClientOrganization(config: {
    organization: InsertOrganization;
    adminUser: { email: string; firstName: string; lastName: string; role: string };
    initialUsers?: Array<{ email: string; firstName: string; lastName: string; role: string }>;
    initialClients?: Array<{ name: string; email?: string; contactPerson?: string }>;
  }): Promise<{ organization: Organization; users: User[]; clients: Client[] }> {
    
    // Create the organization
    const organization = await this.createOrganization(config.organization);
    
    // Create admin user (placeholder - in real app would integrate with auth provider)
    const adminUserData: UpsertUser = {
      id: `setup_${Date.now()}`, // Temporary ID - would be replaced by actual auth integration
      email: config.adminUser.email,
      firstName: config.adminUser.firstName,
      lastName: config.adminUser.lastName,
      role: config.adminUser.role as any,
      organizationId: organization.id,
    };
    
    const adminUser = await this.upsertUser(adminUserData);
    const createdUsers: User[] = [adminUser];
    
    // Create initial team members
    if (config.initialUsers && config.initialUsers.length > 0) {
      for (const userData of config.initialUsers) {
        const userToCreate: UpsertUser = {
          id: `setup_${Date.now()}_${Math.random()}`, // Temporary ID
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role as any,
          organizationId: organization.id,
        };
        const user = await this.upsertUser(userToCreate);
        createdUsers.push(user);
      }
    }
    
    // Create initial clients
    const createdClients: Client[] = [];
    if (config.initialClients && config.initialClients.length > 0) {
      for (const clientData of config.initialClients) {
        const clientToCreate: InsertClient = {
          name: clientData.name,
          email: clientData.email,
          contactPerson: clientData.contactPerson,
          organizationId: organization.id,
        };
        const client = await this.createClient(clientToCreate);
        createdClients.push(client);
      }
    }
    
    return {
      organization,
      users: createdUsers,
      clients: createdClients,
    };
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.isActive, true));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  // Project operations
  async getProjects(): Promise<ProjectWithRelations[]> {
    const results = await db.query.projects.findMany({
      where: eq(projects.isActive, true),
      with: {
        client: true,
        projectManager: true,
        timesheets: true,
        roleTypes: true,
        resources: {
          with: {
            user: true,
            roleType: true,
            planning: true,
          },
        },
      },
    });

    // Calculate financial data for each project
    const projectsWithFinancials = results.map(project => {
      // Calculate total spent from approved timesheets
      const totalSpent = project.timesheets
        ?.filter(timesheet => timesheet.status === 'approved')
        .reduce((total, timesheet) => {
          let hourlyRate = 0;
          
          // First try to find the resource by projectResourceId
          const resource = project.resources?.find(r => r.id === timesheet.projectResourceId);
          if (resource?.roleType?.hourlyRate) {
            hourlyRate = parseFloat(String(resource.roleType.hourlyRate));
          } else {
            // Fallback: Find resource by userId if projectResourceId is null
            const userResource = project.resources?.find(r => r.user?.id === timesheet.userId);
            if (userResource?.roleType?.hourlyRate) {
              hourlyRate = parseFloat(String(userResource.roleType.hourlyRate));
            }
          }
          
          return total + (parseFloat(String(timesheet.hours || '0')) * hourlyRate);
        }, 0) || 0;

      // Calculate remaining forecast from resource planning
      const remainingForecast = project.resources?.reduce((total, resource) => {
        const plannedHours = resource.planning?.reduce((planTotal, plan) => {
          return planTotal + parseFloat(String(plan.plannedHours || 0));
        }, 0) || 0;
        
        // Calculate worked hours for this resource
        const workedHours = project.timesheets
          ?.filter(ts => ts.projectResourceId === resource.id && ts.status === 'approved')
          .reduce((hours, ts) => hours + parseFloat(String(ts.hours || '0')), 0) || 0;
        
        const remainingHours = Math.max(0, plannedHours - workedHours);
        const hourlyRate = parseFloat(String(resource.roleType?.hourlyRate || 0));
        
        return total + (remainingHours * hourlyRate);
      }, 0) || 0;

      return {
        ...project,
        totalSpent,
        remainingForecast,
      };
    });

    return projectsWithFinancials as ProjectWithRelations[];
  }

  async getProject(id: number): Promise<ProjectWithRelations | undefined> {
    const result = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        client: true,
        projectManager: true,
        timesheets: true,
        roleTypes: true,
        resources: {
          with: {
            user: true,
            roleType: true,
            planning: true,
          },
        },
      },
    });
    return result as ProjectWithRelations | undefined;
  }

  async getProjectsByManager(managerId: string): Promise<ProjectWithRelations[]> {
    const results = await db.query.projects.findMany({
      where: and(eq(projects.projectManagerId, managerId), eq(projects.isActive, true)),
      with: {
        client: true,
        projectManager: true,
        timesheets: true,
        roleTypes: true,
        resources: {
          with: {
            user: true,
            roleType: true,
            planning: true,
          },
        },
      },
    });
    return results as ProjectWithRelations[];
  }

  async getProjectsByUser(userId: string): Promise<ProjectWithRelations[]> {
    // Find projects where the user is assigned as a resource
    const userResources = await db.query.projectResources.findMany({
      where: and(
        eq(projectResources.userId, userId),
        eq(projectResources.isActive, true)
      ),
      with: {
        project: {
          with: {
            client: true,
            projectManager: true,
            timesheets: true,
            roleTypes: true,
            resources: {
              with: {
                user: true,
                roleType: true,
                planning: true,
              },
            },
          },
        },
      },
    });

    // Extract unique projects from user resources
    const projectMap = new Map();
    userResources.forEach(resource => {
      if (resource.project && resource.project.isActive) {
        projectMap.set(resource.project.id, resource.project);
      }
    });

    const results = Array.from(projectMap.values());
    return results as ProjectWithRelations[];
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values({
      ...project,
      remainingBudget: project.budget, // Initialize remaining budget
    }).returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  // Project Role Type operations (rate cards)
  async getProjectRoleTypes(projectId: number): Promise<ProjectRoleType[]> {
    return await db.select().from(projectRoleTypes).where(eq(projectRoleTypes.projectId, projectId));
  }

  async createProjectRoleType(roleType: InsertProjectRoleType): Promise<ProjectRoleType> {
    const [newRoleType] = await db.insert(projectRoleTypes).values(roleType).returning();
    return newRoleType;
  }

  async clearProjectRoleTypes(projectId: number): Promise<void> {
    await db.delete(projectRoleTypes).where(eq(projectRoleTypes.projectId, projectId));
  }

  async updateProjectRoleType(id: number, roleType: Partial<InsertProjectRoleType>): Promise<ProjectRoleType | undefined> {
    const [updatedRoleType] = await db
      .update(projectRoleTypes)
      .set({ ...roleType, updatedAt: new Date() })
      .where(eq(projectRoleTypes.id, id))
      .returning();
    return updatedRoleType;
  }

  // Project Resource operations
  async getProjectResources(projectId: number): Promise<ProjectResourceWithRelations[]> {
    const results = await db.query.projectResources.findMany({
      where: eq(projectResources.projectId, projectId),
      with: {
        user: true,
        roleType: true,
        planning: true,
      },
    });
    return results as ProjectResourceWithRelations[];
  }

  async createProjectResource(resource: InsertProjectResource): Promise<ProjectResource> {
    const [newResource] = await db.insert(projectResources).values(resource).returning();
    return newResource;
  }

  async updateProjectResource(id: number, resource: Partial<InsertProjectResource>): Promise<ProjectResource | undefined> {
    const [updatedResource] = await db
      .update(projectResources)
      .set({ ...resource, updatedAt: new Date() })
      .where(eq(projectResources.id, id))
      .returning();
    return updatedResource;
  }

  // Resource Planning operations
  async getResourcePlanning(projectResourceId: number): Promise<ResourcePlanning[]> {
    return await db.select().from(resourcePlanning).where(eq(resourcePlanning.projectResourceId, projectResourceId));
  }

  async createResourcePlanning(planning: InsertResourcePlanning): Promise<ResourcePlanning> {
    const [newPlanning] = await db.insert(resourcePlanning).values(planning).returning();
    return newPlanning;
  }

  async updateResourcePlanning(id: number, planning: Partial<InsertResourcePlanning>): Promise<ResourcePlanning | undefined> {
    const [updatedPlanning] = await db
      .update(resourcePlanning)
      .set({ ...planning, updatedAt: new Date() })
      .where(eq(resourcePlanning.id, id))
      .returning();
    return updatedPlanning;
  }

  // Timesheet operations (role-based access)
  async getTimesheets(userId?: string): Promise<TimesheetWithRelations[]> {
    const whereCondition = userId ? eq(timesheets.userId, userId) : sql`1=1`;
    
    const results = await db.query.timesheets.findMany({
      where: whereCondition,
      with: {
        user: true,
        project: {
          with: {
            client: true,
            projectManager: true,
          },
        },
        projectResource: {
          with: {
            user: true,
            roleType: true,
          },
        },
        approver: true,
      },
      orderBy: [desc(timesheets.createdAt)],
    });
    
    return results as TimesheetWithRelations[];
  }

  async getTimesheet(id: number): Promise<TimesheetWithRelations | undefined> {
    const result = await db.query.timesheets.findFirst({
      where: eq(timesheets.id, id),
      with: {
        user: true,
        project: {
          with: {
            client: true,
            projectManager: true,
          },
        },
        projectResource: {
          with: {
            user: true,
            roleType: true,
          },
        },
        approver: true,
      },
    });
    
    return result as TimesheetWithRelations | undefined;
  }

  async getTimesheetsByStatus(status: string, projectManagerId?: string): Promise<TimesheetWithRelations[]> {
    // For project managers, filter timesheets for their projects only
    let whereCondition = eq(timesheets.status, status as any);
    
    if (projectManagerId) {
      // Get timesheets for projects managed by this project manager
      const managerProjects = await db.select({ id: projects.id })
        .from(projects)
        .where(eq(projects.projectManagerId, projectManagerId));
      
      const projectIds = managerProjects.map(p => p.id);
      if (projectIds.length > 0) {
        whereCondition = and(
          eq(timesheets.status, status as any),
          sql`${timesheets.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})` as any
        ) as any;
      } else {
        // No projects found for this manager
        return [];
      }
    }
    
    const results = await db.query.timesheets.findMany({
      where: whereCondition,
      with: {
        user: true,
        project: {
          with: {
            client: true,
            projectManager: true,
          },
        },
        projectResource: {
          with: {
            user: true,
            roleType: true,
          },
        },
        approver: true,
      },
      orderBy: [desc(timesheets.createdAt)],
    });
    
    return results as TimesheetWithRelations[];
  }

  async getTimesheetsByDateRange(startDate: string, endDate: string, userId?: string): Promise<TimesheetWithRelations[]> {
    let whereCondition = and(
      gte(timesheets.date, startDate),
      lte(timesheets.date, endDate)
    );
    
    if (userId) {
      whereCondition = and(whereCondition, eq(timesheets.userId, userId));
    }
    
    const results = await db.query.timesheets.findMany({
      where: whereCondition,
      with: {
        user: true,
        project: {
          with: {
            client: true,
            projectManager: true,
          },
        },
        projectResource: {
          with: {
            user: true,
            roleType: true,
          },
        },
        approver: true,
      },
      orderBy: [desc(timesheets.date)],
    });
    
    return results as TimesheetWithRelations[];
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    const [newTimesheet] = await db.insert(timesheets).values(timesheet).returning();
    return newTimesheet;
  }

  async updateTimesheet(id: number, timesheet: Partial<InsertTimesheet>): Promise<Timesheet | undefined> {
    const [updatedTimesheet] = await db
      .update(timesheets)
      .set({ ...timesheet, updatedAt: new Date() })
      .where(eq(timesheets.id, id))
      .returning();
    return updatedTimesheet;
  }

  async deleteTimesheet(id: number): Promise<boolean> {
    const [deletedTimesheet] = await db
      .delete(timesheets)
      .where(eq(timesheets.id, id))
      .returning();
    return !!deletedTimesheet;
  }

  async approveTimesheet(id: number, approverId: string): Promise<Timesheet | undefined> {
    const [approvedTimesheet] = await db
      .update(timesheets)
      .set({
        status: "approved",
        approvedBy: approverId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, id))
      .returning();
    return approvedTimesheet;
  }

  async rejectTimesheet(id: number, approverId: string, reason: string): Promise<Timesheet | undefined> {
    // Get the timesheet details first to get project and user info for notification
    const timesheetDetails = await db
      .select({
        timesheet: timesheets,
        project: projects,
        user: users,
      })
      .from(timesheets)
      .leftJoin(projects, eq(timesheets.projectId, projects.id))
      .leftJoin(users, eq(timesheets.userId, users.id))
      .where(eq(timesheets.id, id));

    if (timesheetDetails.length === 0) {
      return undefined;
    }

    const { timesheet, project, user } = timesheetDetails[0];

    // Revert timesheet to draft status so consultant can edit and resubmit
    const [rejectedTimesheet] = await db
      .update(timesheets)
      .set({
        status: "draft",  // Changed from "rejected" to "draft"
        approvedBy: approverId,
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, id))
      .returning();

    // Create notification for the consultant
    if (rejectedTimesheet && user) {
      await this.createNotification({
        userId: user.id,
        type: "timesheet_rejected",
        title: "Timesheet Requires Changes",
        message: `Your timesheet for ${project?.name || 'project'} has been returned for revision. Reason: ${reason}`,
        timesheetId: id,
        actionRequired: true,
        actionUrl: "/timesheets",
        actionText: "Review & Resubmit",
        isRead: false,
      });
    }

    return rejectedTimesheet;
  }

  // Analytics operations
  async getUserMetrics(userId: string, startDate: string, endDate: string): Promise<any> {
    const totalHours = await db
      .select({ total: sql<number>`sum(${timesheets.hours})` })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.userId, userId),
          gte(timesheets.date, startDate),
          lte(timesheets.date, endDate)
        )
      );

    const approvedHours = await db
      .select({ total: sql<number>`sum(${timesheets.hours})` })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.userId, userId),
          eq(timesheets.status, "approved"),
          gte(timesheets.date, startDate),
          lte(timesheets.date, endDate)
        )
      );

    // Calculate billable hours (all hours from projects that have hourly rates)
    const billableHours = await db
      .select({ total: sql<number>`sum(${timesheets.hours})` })
      .from(timesheets)
      .innerJoin(projects, eq(timesheets.projectId, projects.id))
      .innerJoin(projectResources, and(
        eq(projectResources.projectId, projects.id),
        eq(projectResources.userId, userId)
      ))
      .innerJoin(projectRoleTypes, eq(projectResources.roleTypeId, projectRoleTypes.id))
      .where(
        and(
          eq(timesheets.userId, userId),
          gte(timesheets.date, startDate),
          lte(timesheets.date, endDate),
          gt(projectRoleTypes.hourlyRate, '0')
        )
      );

    // Calculate last week's hours for comparison
    const lastWeekStart = new Date(startDate);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(endDate);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    const lastWeekHours = await db
      .select({ total: sql<number>`sum(${timesheets.hours})` })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.userId, userId),
          gte(timesheets.date, lastWeekStart.toISOString().split('T')[0]),
          lte(timesheets.date, lastWeekEnd.toISOString().split('T')[0])
        )
      );

    return {
      totalHours: totalHours[0]?.total || 0,
      approvedHours: approvedHours[0]?.total || 0,
      billableHours: billableHours[0]?.total || 0,
      lastWeekHours: lastWeekHours[0]?.total || 0,
    };
  }

  async getProjectMetrics(projectId?: number): Promise<any> {
    if (projectId) {
      // Return metrics for a specific project
      const whereCondition = eq(timesheets.projectId, projectId);

      const totalHours = await db
        .select({ total: sql<number>`sum(${timesheets.hours})` })
        .from(timesheets)
        .where(whereCondition);

      const approvedHours = await db
        .select({ total: sql<number>`sum(${timesheets.hours})` })
        .from(timesheets)
        .where(and(whereCondition, eq(timesheets.status, "approved")));

      return {
        totalHours: totalHours[0]?.total || 0,
        approvedHours: approvedHours[0]?.total || 0,
      };
    } else {
      // Return metrics for all projects as an array
      const projectMetrics = await db
        .select({
          projectId: timesheets.projectId,
          projectName: projects.name,
          totalHours: sql<number>`sum(${timesheets.hours})`,
          billableHours: sql<number>`sum(case when ${timesheets.type} = 'billable' then ${timesheets.hours} else 0 end)`,
          approvedHours: sql<number>`sum(case when ${timesheets.status} = 'approved' then ${timesheets.hours} else 0 end)`,
        })
        .from(timesheets)
        .leftJoin(projects, eq(timesheets.projectId, projects.id))
        .where(eq(projects.isActive, true))
        .groupBy(timesheets.projectId, projects.name)
        .orderBy(sql<number>`sum(${timesheets.hours}) DESC`);

      return projectMetrics;
    }
  }

  async getManagerMetrics(managerId: string): Promise<any> {
    // Get projects managed by this manager
    const managerProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.projectManagerId, managerId));

    if (managerProjects.length === 0) {
      return { totalHours: 0, approvedHours: 0, pendingTimesheets: 0 };
    }

    const projectIds = managerProjects.map(p => p.id);
    const projectIdsCondition = sql`${timesheets.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`;

    const totalHours = await db
      .select({ total: sql<number>`sum(${timesheets.hours})` })
      .from(timesheets)
      .where(projectIdsCondition);

    const approvedHours = await db
      .select({ total: sql<number>`sum(${timesheets.hours})` })
      .from(timesheets)
      .where(and(projectIdsCondition, eq(timesheets.status, "approved")));

    const pendingCount = await db
      .select({ count: count() })
      .from(timesheets)
      .where(and(projectIdsCondition, eq(timesheets.status, "submitted")));

    // Get additional manager metrics
    const totalProjects = managerProjects.length;
    
    const totalTeamHours = await db
      .select({ total: sql<number>`sum(${timesheets.hours})` })
      .from(timesheets)
      .where(and(projectIdsCondition, eq(timesheets.status, "approved")));

    return {
      totalHours: totalHours[0]?.total || 0,
      approvedHours: approvedHours[0]?.total || 0,
      pendingApprovals: pendingCount[0]?.count || 0,
      totalProjects,
      totalTeamHours: totalTeamHours[0]?.total || 0,
    };
  }

  // Resource Forecast operations
  async getResourceForecasts(): Promise<any> {
    try {
      // Get all users with their projects and forecasts
      const usersWithProjects = await db
        .select()
        .from(users)
        .where(ne(users.role, "admin" as any));

      const result = [];

      for (const user of usersWithProjects) {
        // Get projects assigned to this user
        const userProjects = await db
          .select({
            project: projects,
            resource: projectResources,
          })
          .from(projectResources)
          .innerJoin(projects, eq(projectResources.projectId, projects.id))
          .where(eq(projectResources.userId, user.id));

        const userProjectData = [];

        for (const { project } of userProjects) {
          // Get forecasts for this user and project
          const forecasts = await db
            .select()
            .from(resourceForecasts)
            .where(
              and(
                eq(resourceForecasts.userId, user.id),
                eq(resourceForecasts.projectId, project.id)
              )
            );

          // Add actual hours from timesheets
          const forecastsWithActuals = await Promise.all(
            forecasts.map(async (forecast) => {
              const weekStart = new Date(forecast.weekStarting);
              const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
              
              const actualHoursResult = await db
                .select({
                  total: sum(timesheets.hours)
                })
                .from(timesheets)
                .where(
                  and(
                    eq(timesheets.userId, user.id),
                    eq(timesheets.projectId, project.id),
                    gte(timesheets.date, weekStart.toISOString().split('T')[0]),
                    lt(timesheets.date, weekEnd.toISOString().split('T')[0])
                  )
                );

              return {
                ...forecast,
                forecastHours: parseFloat(forecast.forecastHours),
                actualHours: parseFloat(actualHoursResult[0]?.total || "0"),
              };
            })
          );

          userProjectData.push({
            project,
            forecasts: forecastsWithActuals,
          });
        }

        if (userProjectData.length > 0) {
          result.push({
            user,
            projects: userProjectData,
          });
        }
      }

      return result;
    } catch (error) {
      console.error("Error getting resource forecasts:", error);
      throw error;
    }
  }

  async createResourceForecast(forecast: InsertResourceForecast): Promise<ResourceForecast> {
    try {
      const [result] = await db
        .insert(resourceForecasts)
        .values(forecast)
        .onConflictDoNothing()
        .returning();
      
      return result;
    } catch (error) {
      console.error("Error creating resource forecast:", error);
      throw error;
    }
  }

  async updateResourceForecast(
    userId: string, 
    projectId: number, 
    weekStarting: string, 
    forecastHours: number
  ): Promise<ResourceForecast | undefined> {
    try {
      const [result] = await db
        .update(resourceForecasts)
        .set({
          forecastHours: forecastHours.toString(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(resourceForecasts.userId, userId),
            eq(resourceForecasts.projectId, projectId),
            eq(resourceForecasts.weekStarting, weekStarting)
          )
        )
        .returning();

      if (!result) {
        // Create new forecast if it doesn't exist
        return await this.createResourceForecast({
          userId,
          projectId,
          weekStarting,
          forecastHours: forecastHours.toString(),
        });
      }

      return result;
    } catch (error) {
      console.error("Error updating resource forecast:", error);
      throw error;
    }
  }

  // Change order operations
  async createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder> {
    const [result] = await db.insert(changeOrders).values(changeOrder).returning();
    return result;
  }

  async getChangeOrders(projectId: number): Promise<ChangeOrder[]> {
    return await db
      .select()
      .from(changeOrders)
      .where(eq(changeOrders.projectId, projectId))
      .orderBy(desc(changeOrders.dateSigned));
  }

  async updateChangeOrderStatus(id: number, status: string): Promise<ChangeOrder | undefined> {
    const [result] = await db
      .update(changeOrders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(changeOrders.id, id))
      .returning();
    return result;
  }

  // Project burn tracking operations
  async upsertProjectBurn(burn: InsertProjectBurn): Promise<ProjectBurn> {
    const [result] = await db
      .insert(projectBurn)
      .values(burn)
      .onConflictDoUpdate({
        target: [projectBurn.projectId, projectBurn.weekStarting],
        set: {
          actualHours: burn.actualHours,
          actualCost: burn.actualCost,
          forecastHours: burn.forecastHours,
          forecastCost: burn.forecastCost,
          cumulativeActualHours: burn.cumulativeActualHours,
          cumulativeActualCost: burn.cumulativeActualCost,
          cumulativeForecastHours: burn.cumulativeForecastHours,
          cumulativeForecastCost: burn.cumulativeForecastCost,
          budgetAtWeek: burn.budgetAtWeek,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getProjectBurn(projectId: number): Promise<ProjectBurn[]> {
    return await db
      .select()
      .from(projectBurn)
      .where(eq(projectBurn.projectId, projectId))
      .orderBy(projectBurn.weekStarting);
  }

  async calculateProjectMetrics(projectId: number): Promise<{
    totalActualHours: number;
    totalActualCost: number;
    totalForecastHours: number;
    totalForecastCost: number;
    budgetRemaining: number;
    projectedOverrun: number;
  }> {
    // Get project details
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      throw new Error('Project not found');
    }

    // Get burn data
    const burnData = await this.getProjectBurn(projectId);
    
    const totalActualHours = burnData.reduce((sum, burn) => sum + parseFloat(burn.actualHours || '0'), 0);
    const totalActualCost = burnData.reduce((sum, burn) => sum + parseFloat(burn.actualCost || '0'), 0);
    const totalForecastHours = burnData.reduce((sum, burn) => sum + parseFloat(burn.forecastHours || '0'), 0);
    const totalForecastCost = burnData.reduce((sum, burn) => sum + parseFloat(burn.forecastCost || '0'), 0);
    
    const budget = parseFloat(project.budget || '0');
    const budgetRemaining = budget - totalActualCost;
    const projectedOverrun = Math.max(0, totalForecastCost - budget);

    return {
      totalActualHours,
      totalActualCost,
      totalForecastHours,
      totalForecastCost,
      budgetRemaining,
      projectedOverrun,
    };
  }

  // Notification operations
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return result[0]?.count || 0;
  }

  async clearNotificationsByType(userId: string, type: string): Promise<void> {
    await db
      .delete(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.type, type)));
  }

  async clearTimesheetNotifications(userId: string, timesheetId?: number): Promise<void> {
    let whereCondition = and(
      eq(notifications.userId, userId), 
      eq(notifications.type, 'timesheet_submitted')
    );
    
    if (timesheetId) {
      whereCondition = and(whereCondition, eq(notifications.timesheetId, timesheetId));
    }
    
    await db
      .delete(notifications)
      .where(whereCondition);
  }
}

export const storage = new DatabaseStorage();