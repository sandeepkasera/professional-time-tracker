import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Eye, X, User } from "lucide-react";

interface AdminViewBarProps {
  isViewingAs: boolean;
  viewingAsRole: string | null;
  viewingAsUser: string | null;
  onViewAsChange: (role: string | null, userId?: string) => void;
  onExitViewAs: () => void;
  availableUsers?: Array<{ id: string; name: string; role: string; email: string }>;
}

export default function AdminViewBar({
  isViewingAs,
  viewingAsRole,
  viewingAsUser,
  onViewAsChange,
  onExitViewAs,
  availableUsers = []
}: AdminViewBarProps) {
  if (!isViewingAs) {
    return null;
  }

  const currentUser = availableUsers.find(u => u.id === viewingAsUser);

  return (
    <div className="bg-blue-600 text-white px-6 py-3 shadow-lg border-b-2 border-blue-700">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span className="font-semibold">Admin View Mode</span>
          </div>
          
          <div className="h-4 w-px bg-blue-300"></div>
          
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span className="text-sm">
              Viewing as: <span className="font-medium capitalize">{viewingAsRole}</span>
              {currentUser && (
                <span className="ml-2 text-blue-200">
                  ({currentUser.name} - {currentUser.email})
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Select 
            value={viewingAsRole || ""} 
            onValueChange={(role) => onViewAsChange(role)}
          >
            <SelectTrigger className="w-48 bg-blue-500 border-blue-400 text-white">
              <SelectValue placeholder="Switch view..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="consultant">Consultant View</SelectItem>
              <SelectItem value="project_manager">Project Manager View</SelectItem>
              <SelectItem value="admin">Admin View</SelectItem>
            </SelectContent>
          </Select>

          {availableUsers.length > 0 && (
            <Select 
              value={viewingAsUser || ""} 
              onValueChange={(userId) => {
                const user = availableUsers.find(u => u.id === userId);
                if (user) {
                  onViewAsChange(user.role, userId);
                }
              }}
            >
              <SelectTrigger className="w-64 bg-blue-500 border-blue-400 text-white">
                <SelectValue placeholder="View as specific user..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers
                  .filter(user => user.role !== 'admin')
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role.replace('_', ' ')})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}

          <Button 
            variant="outline" 
            size="sm"
            onClick={onExitViewAs}
            className="bg-transparent border-white text-white hover:bg-blue-500 hover:text-white"
          >
            <X className="h-4 w-4 mr-2" />
            Exit View Mode
          </Button>
        </div>
      </div>
    </div>
  );
}