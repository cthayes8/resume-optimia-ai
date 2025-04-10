
import { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { FileText, ExternalLink, Calendar, BarChart2, ArrowUpDown } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";

// Mock data for past optimizations
const mockOptimizations = [
  {
    id: "opt-1",
    jobTitle: "Frontend Developer",
    company: "Tech Solutions Inc.",
    date: "2025-04-08",
    score: 87,
    status: "completed"
  },
  {
    id: "opt-2",
    jobTitle: "UX Designer",
    company: "Creative Agency",
    date: "2025-04-05",
    score: 92,
    status: "completed"
  },
  {
    id: "opt-3",
    jobTitle: "Product Manager",
    company: "Software Innovations",
    date: "2025-04-01",
    score: 76,
    status: "completed"
  },
  {
    id: "opt-4",
    jobTitle: "Full Stack Developer",
    company: "Web Systems Ltd.",
    date: "2025-03-25",
    score: 81,
    status: "completed"
  },
  {
    id: "opt-5",
    jobTitle: "Data Analyst",
    company: "Data Insights Co.",
    date: "2025-03-20",
    score: 85,
    status: "completed"
  }
];

export default function History() {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };
  
  // Sort data based on current sort settings
  const sortedData = [...mockOptimizations].sort((a, b) => {
    if (!sortField) return 0;
    
    const fieldA = a[sortField as keyof typeof a];
    const fieldB = b[sortField as keyof typeof b];
    
    if (typeof fieldA === 'string' && typeof fieldB === 'string') {
      return sortDirection === "asc" 
        ? fieldA.localeCompare(fieldB) 
        : fieldB.localeCompare(fieldA);
    }
    
    if (typeof fieldA === 'number' && typeof fieldB === 'number') {
      return sortDirection === "asc" ? fieldA - fieldB : fieldB - fieldA;
    }
    
    return 0;
  });

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <>
      <Helmet>
        <title>Past Optimizations | Resume ATS Optimizer</title>
      </Helmet>
      
      <DashboardLayout>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Past Optimizations</h2>
            <p className="text-muted-foreground">
              View and analyze your previous resume optimization results
            </p>
          </div>
          <Link to="/optimize" className="mt-4 md:mt-0">
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              New Optimization
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Optimization History</CardTitle>
            <CardDescription>
              A record of all your past resume optimizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="font-medium flex items-center text-left -ml-3"
                        onClick={() => handleSort("jobTitle")}
                      >
                        Position
                        {sortField === "jobTitle" && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortField === "jobTitle" ? "opacity-100" : "opacity-40"}`} />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="font-medium flex items-center text-left -ml-3"
                        onClick={() => handleSort("date")}
                      >
                        Date
                        {sortField === "date" && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortField === "date" ? "opacity-100" : "opacity-40"}`} />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="font-medium flex items-center justify-end text-right -mr-3"
                        onClick={() => handleSort("score")}
                      >
                        Match Score
                        {sortField === "score" && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortField === "score" ? "opacity-100" : "opacity-40"}`} />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((optimization) => (
                    <TableRow key={optimization.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{optimization.jobTitle}</div>
                          <div className="text-sm text-muted-foreground">{optimization.company}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {formatDate(optimization.date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={optimization.score >= 90 ? "success" : 
                                 optimization.score >= 80 ? "default" : 
                                 optimization.score >= 70 ? "warning" : "destructive"}
                          className="ml-auto"
                        >
                          {optimization.score}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/results?id=${optimization.id}`}>
                            <Button variant="outline" size="sm">
                              <BarChart2 className="h-4 w-4" />
                              <span className="sr-only">View Results</span>
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">Export</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">2</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    </>
  );
}
