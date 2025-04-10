
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  description?: string;
  icon: ReactNode;
  linkTo?: string;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
}

export default function DashboardCard({
  title,
  description,
  icon,
  linkTo,
  className,
  onClick,
  children
}: DashboardCardProps) {
  const CardWrapper = ({ children }: { children: ReactNode }) => {
    if (linkTo) {
      return <Link to={linkTo}>{children}</Link>;
    }
    if (onClick) {
      return <div onClick={onClick} className="cursor-pointer">{children}</div>;
    }
    return <>{children}</>;
  };

  return (
    <CardWrapper>
      <Card className={cn("card-hover h-full", className)}>
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div className="rounded-full p-2 bg-primary/10 text-primary">{icon}</div>
          <div className="space-y-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </CardWrapper>
  );
}
