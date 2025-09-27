import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SupportPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                For help, contact us at <a href="mailto:support@glauber.ai" className="text-primary underline">support@glauber.ai</a>.
              </div>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Your Message</label>
                  <textarea className="w-full border rounded p-2 min-h-[100px]" placeholder="Describe your issue or question..." />
                </div>
                <Button type="submit">Send</Button>
              </form>
              <div className="pt-6 text-muted-foreground text-sm">
                We typically respond within 24 hours.
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
} 