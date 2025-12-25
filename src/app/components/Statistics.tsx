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
        <h1 className="mb-1">Статистика</h1>
        <p className="text-muted-foreground">
          Отслеживайте свой прогресс и паттерны обучения
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
            <div className="text-sm text-muted-foreground">Дней подряд</div>
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
            <div className="text-sm text-muted-foreground">Освоено стихов</div>
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
            <div className="text-sm text-muted-foreground">Уровень освоения</div>
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
            <div className="text-sm text-muted-foreground">Повторений на этой неделе</div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Reviews Chart */}
        <Card className="p-6">
          <h3 className="mb-6">Повторения на этой неделе</h3>
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
          <h3 className="mb-6">Распределение по уровню освоения</h3>
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
        <h3 className="mb-4">Инсайты обучения</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
            <div>
              <p className="text-sm">
                У вас <span className="font-medium text-primary">серия из {stats.streak} дней</span>! 
                Продолжайте, повторяя хотя бы один стих ежедневно.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-[#059669] rounded-full mt-2"></div>
            <div>
              <p className="text-sm">
                Вы освоили <span className="font-medium text-[#059669]">{stats.versesMastered} стихов</span> из {stats.totalVerses}. 
                Это {masteryPercentage}% вашей коллекции!
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm">
                Ваш самый продуктивный день на этой неделе —{' '}
                <span className="font-medium">
                  {Math.max(...stats.weeklyReviews.map(d => d.reviews))} повторений
                </span>.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
