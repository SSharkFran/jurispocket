import { Link } from "react-router-dom";
import { Scale, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return <Link to="/" replace><meta httpEquiv="refresh" content="0;url=/" /></Link>;
};

export default Index;
