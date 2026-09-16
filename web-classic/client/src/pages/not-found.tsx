import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">{t('notFound.title', '404 Page Not Found')}</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {t('notFound.message', 'The page you are looking for does not exist.')}
          </p>

          <Link href="/">
            <Button className="w-full mt-6" data-testid="button-home">
              {t('notFound.backHome', 'Go Back Home')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
