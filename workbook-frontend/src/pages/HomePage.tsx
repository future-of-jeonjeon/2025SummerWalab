import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card, CardBody } from '../components/common/Card';
import { 
  BookOpen, 
  Trophy, 
  Code, 
  Users, 
  Target, 
  Zap,
  ArrowRight,
  Star
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const features = [
    {
      icon: BookOpen,
      title: '문제집',
      description: '체계적으로 구성된 문제집으로 단계별 학습이 가능합니다.',
      link: '/workbooks',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Code,
      title: '문제 풀이',
      description: '다양한 난이도의 알고리즘 문제를 풀어보세요.',
      link: '/problems',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Trophy,
      title: '컨테스트',
      description: '실시간 코딩 대회에 참여하여 실력을 겨뤄보세요.',
      link: '/contests',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      icon: Users,
      title: '커뮤니티',
      description: '다른 개발자들과 함께 성장하세요.',
      link: '#',
      color: 'from-purple-500 to-purple-600'
    }
  ];

  const stats = [
    { label: '문제 수', value: '1,000+', icon: Code },
    { label: '문제집', value: '50+', icon: BookOpen },
    { label: '컨테스트', value: '20+', icon: Trophy },
    { label: '사용자', value: '500+', icon: Users }
  ];

  return (
    <div className="min-h-screen">
      {/* 히어로 섹션 */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Your Coding Journey
              <br />
              <span className="text-yellow-300">Starts Here</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 leading-relaxed">
              Practice real problems, compete with peers. 
              <br />
              Grow your skills on HGU's coding platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/problems">
                <Button size="lg" className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold px-8 py-4 text-lg">
                  <Code className="w-5 h-5 mr-2" />
                  문제 풀어보기
                </Button>
              </Link>
              <Link to="/workbooks">
                <Button variant="secondary" size="lg" className="bg-white/10 hover:bg-white/20 text-white border-white/20 px-8 py-4 text-lg">
                  <BookOpen className="w-5 h-5 mr-2" />
                  문제집 둘러보기
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* 배경 패턴 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-20 h-20 border-2 border-white rounded-full"></div>
          <div className="absolute top-40 right-20 w-16 h-16 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-40 right-1/3 w-24 h-24 border-2 border-white rounded-full"></div>
        </div>
      </section>

      {/* 서비스 소개 섹션 */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              SERVICE WE PROVIDE
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              다양한 기능으로 여러분의 코딩 실력을 향상시켜보세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="text-center group hover:shadow-xl transition-all duration-300">
                  <CardBody className="p-8">
                    <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      {feature.description}
                    </p>
                    <Link to={feature.link}>
                      <Button variant="ghost" className="group-hover:bg-gray-50">
                        자세히 보기
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 통계 섹션 */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <Icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 font-medium">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 문제 추천 섹션 */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              PRACTICE WITH CODING PROBLEMS
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              다양한 난이도의 문제로 실력을 향상시켜보세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { level: 'Level 3', title: '정수 더하기', difficulty: 'Hard' },
              { level: 'Level 1', title: '코드당과 첫 만남', difficulty: 'Easy' },
              { level: 'Level 2', title: '꾸러기 수비대', difficulty: 'Medium' },
              { level: 'Level 1', title: '햄부기온앤온', difficulty: 'Easy' },
            ].map((problem, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300">
                <CardBody className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {problem.level}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      problem.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                      problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {problem.difficulty}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {problem.title}
                  </h3>
                  <Link to="/problems">
                    <Button variant="ghost" className="w-full group-hover:bg-blue-50 group-hover:text-blue-600">
                      문제 풀기
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 컨테스트 섹션 */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              TAKE PART IN REAL-TIME<br />
              CODING CONTEST
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Check your skills, and try to compete in the rankings.<br />
              Make it more fun and immersive with real-time rankings!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contests">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
                  <Trophy className="w-5 h-5 mr-2" />
                  컨테스트 참여하기
                </Button>
              </Link>
              <Button variant="secondary" size="lg" className="px-8 py-4 text-lg">
                <Target className="w-5 h-5 mr-2" />
                컨테스트 개최하기
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-xl font-bold">HGU OJ</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-400 mb-2">ⓒ 2025. HGU OJ All rights reserved.</p>
              <p className="text-gray-500 text-sm">Since 2025</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
