import { AlertCircle, HelpCircle, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReviewItemProps {
  type: 'question' | 'alert' | 'unmatched';
  title: string;
  description: string;
}

const ReviewItem = ({ type, title, description }: ReviewItemProps) => {
  const iconMap = {
    question: <HelpCircle className="w-5 h-5 text-warning" />,
    alert: <AlertCircle className="w-5 h-5 text-destructive" />,
    unmatched: <FileWarning className="w-5 h-5 text-muted-foreground" />,
  };

  const bgMap = {
    question: 'bg-warning/10',
    alert: 'bg-destructive/10',
    unmatched: 'bg-muted',
  };

  return (
    <div className="review-item">
      <div className={`w-10 h-10 rounded-xl ${bgMap[type]} flex items-center justify-center flex-shrink-0`}>
        {iconMap[type]}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground mb-1 text-sm sm:text-base">{title}</h4>
        <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex-shrink-0 mt-2 sm:mt-0 w-full sm:w-auto"
      >
        Review
      </Button>
    </div>
  );
};

export default ReviewItem;