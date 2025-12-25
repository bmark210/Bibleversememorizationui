import { Flame, Target, TrendingUp, Calendar } from 'lucide-react';
import { Card } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StatsProps {
  stats: {
    streak: number;
    versesMastered: number;
    totalVerses: number;
    reviewsThisWeek: number;
    weeklyReviews: { day: string; reviews: number }[];
    masteryDistribution: { level: string; count: number }[];
  };
}

export function Statistics({ stats }: StatsProps) {
  const masteryPercentage = Math.round((stats.versesMastered / stats.totalVerses) * 100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1">Statistics</h1>
        <p className="text-muted-foreground">
          Track your progress and learning patterns
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-semibold">{stats.streak}</div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-[#059669]" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-semibold">{stats.versesMastered}</div>
            <div className="text-sm text-muted-foreground">Verses Mastered</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-semibold">{masteryPercentage}%</div>
            <div className="text-sm text-muted-foreground">Mastery Rate</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-semibold">{stats.reviewsThisWeek}</div>
            <div className="text-sm text-muted-foreground">Reviews This Week</div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Reviews Chart */}
        <Card className="p-6">
          <h3 className="mb-6">Reviews This Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.weeklyReviews}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(30, 64, 175, 0.05)' }}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
              />
              <Bar dataKey="reviews" radius={[8, 8, 0, 0]}>
                {stats.weeklyReviews.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#1E40AF" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Mastery Distribution Chart */}
        <Card className="p-6">
          <h3 className="mb-6">Mastery Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.masteryDistribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="level" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(30, 64, 175, 0.05)' }}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {stats.masteryDistribution.map((entry, index) => {
                  const colors = ['#DC2626', '#F59E0B', '#3B82F6', '#059669'];
                  return <Cell key={`cell-${index}`} fill={colors[index]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Learning Insights */}
      <Card className="p-6 mt-6">
        <h3 className="mb-4">Learning Insights</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
            <div>
              <p className="text-sm">
                You're on a <span className="font-medium text-primary">{stats.streak}-day streak</span>! 
                Keep it up by reviewing at least one verse daily.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-[#059669] rounded-full mt-2"></div>
            <div>
              <p className="text-sm">
                You've mastered <span className="font-medium text-[#059669]">{stats.versesMastered} verses</span> out of {stats.totalVerses}. 
                That's {masteryPercentage}% of your collection!
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm">
                Your most productive day this week was with{' '}
                <span className="font-medium">
                  {Math.max(...stats.weeklyReviews.map(d => d.reviews))} reviews
                </span>.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
