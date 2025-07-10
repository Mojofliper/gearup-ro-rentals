import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

interface SkeletonProps {
  className?: string;
}

// Basic skeleton components
export const TextSkeleton: React.FC<SkeletonProps> = ({ className }) => (
  <Skeleton className={`h-4 w-full ${className || ""}`} />
);

export const AvatarSkeleton: React.FC<SkeletonProps> = ({ className }) => (
  <Skeleton className={`h-10 w-10 rounded-full ${className || ""}`} />
);

export const ImageSkeleton: React.FC<SkeletonProps> = ({ className }) => (
  <Skeleton className={`aspect-[4/3] w-full ${className || ""}`} />
);

// Gear card skeleton
export const GearCardSkeleton: React.FC = () => (
  <Card className="overflow-hidden">
    <CardHeader className="p-0">
      <ImageSkeleton />
    </CardHeader>
    <CardContent className="p-4 space-y-3">
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex items-center space-x-2">
        <AvatarSkeleton className="h-6 w-6" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </CardContent>
    <CardFooter className="p-4 pt-0">
      <div className="w-full space-y-3">
        <div className="flex justify-between">
          <div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-12 mt-1" />
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12 mt-1" />
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </div>
    </CardFooter>
  </Card>
);

// Grid skeleton for multiple items
export const GridSkeleton: React.FC<{ count?: number; columns?: number }> = ({
  count = 6,
  columns = 3,
}) => (
  <div
    className="grid gap-6"
    style={{
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    }}
  >
    {Array.from({ length: count }).map((_, index) => (
      <GearCardSkeleton key={index} />
    ))}
  </div>
);

// Dashboard skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Recent activity */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-3">
              <AvatarSkeleton className="h-8 w-8" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// Booking skeleton
export const BookingSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-4">
      <div className="flex space-x-4">
        <ImageSkeleton className="h-20 w-20 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex space-x-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Message skeleton
export const MessageSkeleton: React.FC = () => (
  <div className="flex space-x-3">
    <AvatarSkeleton className="h-8 w-8 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-4 w-3/4" />
    </div>
  </div>
);

// Form skeleton
export const FormSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-20 w-full" />
    </div>
    <Skeleton className="h-10 w-32" />
  </div>
);

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} className="h-4 w-20" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 w-20" />
        ))}
      </div>
    ))}
  </div>
);
