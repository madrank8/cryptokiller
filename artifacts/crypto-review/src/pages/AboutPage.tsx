import {
  Shield, Users, Eye, Target, BookOpen, Code,
  Newspaper, PenTool, TrendingUp, MapPin, ExternalLink
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import SiteHeader from "@/components/SiteHeader";

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
}

const leadership: TeamMember[] = [
  {
    name: "Richard Melton",
    role: "CEO & Founder",
    bio: "Richard is the passionate CEO and Founder of DEX, a pioneering financial crypto trading company. With his entrepreneurial spirit and expertise in technology and finance, Richard established DEX to bridge the gap between traditional finance and the world of cryptocurrencies. Under his visionary leadership, DEX.ag has become a trusted platform known for its user-friendly interface and cutting-edge solutions.",
    image: "https://dex.ag/wp-content/uploads/2023/07/imgonline-com-ua-Black-White-fAvLaOSNkWZxgIZ.jpg",
  },
  {
    name: "David Huang",
    role: "CFO",
    bio: "David is a seasoned CFO with over 20 years of experience in the financial world. With previous roles as Financial VP at Great Eastern and Far East Organization, he brings a wealth of expertise in financial management and strategic decision-making. Known for his analytical mindset and collaborative leadership, David is dedicated to driving sustainable financial success.",
    image: "https://dex.ag/wp-content/uploads/2023/07/imgonline-com-ua-Black-White-hZCAeLqryC7Ng.jpg",
  },
  {
    name: "James Taylor",
    role: "CTO",
    bio: "James is a highly skilled and result-driven CTO with over 9 years of experience in the financial industry. With expertise in software development and Agile methodologies, he has designed and implemented innovative applications and solutions using various technologies. His commitment to excellence and passion for staying at the forefront of technological advancements make him invaluable.",
    image: "https://dex.ag/wp-content/uploads/2023/07/imgonline-com-ua-Black-White-J9m5OWdGbh3dlto.jpg",
  },
  {
    name: "Maria Wieck",
    role: "Algo Developer",
    bio: "Experienced algorithm developer with expertise in creating powerful trading algorithms for the fast-paced world of crypto trading. Skilled in statistical analysis and machine learning, committed to delivering exceptional results and staying at the forefront of this ever-evolving industry.",
    image: "https://dex.ag/wp-content/uploads/2023/07/imgonline-com-ua-Black-White-9mU5NLKGHiZP0r.jpg",
  },
  {
    name: "John Feldt",
    role: "Crypto Analyst",
    bio: "John is a seasoned Cryptocurrency Analyst with over 6 years of experience in the crypto world. With a deep passion for all things crypto, he has dedicated his career to understanding and analyzing the dynamic landscape of digital currencies. His enthusiasm drives him to stay at the forefront of industry trends.",
    image: "https://dex.ag/wp-content/uploads/2023/07/imgonline-com-ua-Black-White-PmH2jCKtVTzGdD.jpg",
  },
];

const editorial: TeamMember[] = [
  {
    name: "Gary McFarlane",
    role: "Editor-in-Chief",
    bio: "Gary is a highly accomplished financial analyst who possesses a vast reservoir of knowledge and expertise in the dynamic world of cryptocurrency. Currently holding the esteemed position of Editor-in-Chief, Gary's contributions have been invaluable to the organization.",
    image: "https://dex.ag/wp-content/uploads/2023/07/Gary-McFarlane-BW.jpg",
  },
  {
    name: "James Spillane",
    role: "Senior Editor",
    bio: "James holds a Bachelor's degree in Physics from Imperial College London, UK. He possesses a diverse range of interests that transcend the realm of science and academia, showcasing his knowledge and expertise as a writer in the fascinating fields of cryptocurrency and finance.",
    image: "https://dex.ag/wp-content/uploads/2023/07/James-Spillane-bw.jpg",
  },
  {
    name: "Alan Draper",
    role: "Writer",
    bio: "Alan is a highly knowledgeable individual in the realm of cryptocurrencies. He demonstrates exceptional leadership skills as he oversees a team dedicated to maintaining the accuracy, relevance, and timeliness of the cryptocurrency guide and review content on the platform.",
    image: "https://dex.ag/wp-content/uploads/2023/07/Alan-Draper-bw-portrait.jpg",
  },
  {
    name: "Arslan Butt",
    role: "Senior Writer",
    bio: "Arslan is an accomplished live webinar speaker and derivatives analyst who possesses extensive expertise in cryptocurrency, forex, commodities, and indices. With an MBA in Finance and an MPhil in Behavioral Finance, he has cultivated profound insights into evaluating financial data and discerning investment trends.",
    image: "https://dex.ag/wp-content/uploads/2023/07/Ali-Butt-bw-1.jpg",
  },
  {
    name: "Connor Brooke",
    role: "Financial Writer",
    bio: "Connor is a highly accomplished financial professional hailing from Scotland, with a strong focus on wealth management and equity investing. He dedicates his time to full-time writing, catering to a diverse range of financial websites, and extends his expertise in startup consulting to small businesses.",
    image: "https://dex.ag/wp-content/uploads/2023/07/Connor-Brooke-bw-portrait.jpg",
  },
];

const analysts: TeamMember[] = [
  {
    name: "Alejandro Arrieche",
    role: "Financial Analyst & Writer",
    bio: "Alejandro is a seasoned financial analyst and accomplished freelance writer boasting an impressive track record of over seven years. With a keen eye for market trends, his contributions have graced esteemed publications including The Modest Wallet, Buyshares, Capital.com, and LearnBonds.",
    image: "https://dex.ag/wp-content/uploads/2023/07/Alejandro-Arrieche-bw.jpg",
  },
  {
    name: "Amy Clark",
    role: "Software Editor",
    bio: "Amy plays a crucial role within the team, working closely with colleagues to ensure that all content is optimized, up-to-date, and tailored to readers' needs. She brings a wealth of experience, having previously contributed to various esteemed websites.",
    image: "https://dex.ag/wp-content/uploads/2023/07/Amy-Clark-BW-1.jpg",
  },
  {
    name: "Jamie McNeill",
    role: "DeFi Specialist",
    bio: "Jamie is a distinguished authority in the ever-evolving realm of DeFi, possessing a profound comprehension of blockchain consensus and governance models. He generously imparts insights on emerging technologies, offering invaluable commentary on the newest trends and advancements.",
    image: "https://dex.ag/wp-content/uploads/2023/07/Jamie-McNeill-bw.jpg",
  },
  {
    name: "Joel Frank",
    role: "Cryptocurrency Analyst",
    bio: "Joel is an accomplished financial market and cryptocurrency analyst who possesses an unwavering enthusiasm for cutting-edge technologies that promote decentralization. He has been a distinguished provider of expert analysis for financial and crypto markets since 2018.",
    image: "https://dex.ag/wp-content/uploads/2023/07/Joel-Frank-bw.jpg",
  },
  {
    name: "Kane Pepi",
    role: "Crypto Writer",
    bio: "Kane boasts extensive expertise as a seasoned writer in the fields of finance and cryptocurrency. With a remarkable portfolio comprising 2,000+ articles, guides, and market insights, he has established himself as a trusted source of information. His strengths include asset valuation, portfolio management, and financial crime prevention.",
    image: "https://dex.ag/wp-content/uploads/2023/07/Kane-Pepi-bw.jpg",
  },
];

const cryptoWriters: TeamMember[] = [
  {
    name: "Yash Majithia",
    role: "Crypto Writer",
    bio: "Yash is a highly skilled writer and analyst in the field of cryptocurrencies with a robust background in financial analysis and reporting. He has been actively publishing articles for various reputable crypto publications, covering on-chain and technical analysis as well as the latest industry developments.",
    image: "https://dex.ag/wp-content/uploads/2023/07/Yash-Majithia-bw.jpg",
  },
  {
    name: "Matt Williams",
    role: "Crypto Writer",
    bio: "Matthew possesses a deep-rooted desire to assist individuals in attaining financial independence. His profound fascination with stocks and Fintech has propelled him to master the field, honing his ability to spot trends and create captivating educational content.",
    image: "https://dex.ag/wp-content/uploads/2023/07/Matt-Williams-bw.jpg",
  },
  {
    name: "Michael Abetz",
    role: "Crypto Writer",
    bio: "After experiencing the bullish cryptocurrency market in 2017, Michael developed a strong passion for investing and trading in digital currencies. Today, he leverages his knowledge as a freelance writer, creating informative content centered around decentralized finance subjects.",
    image: "https://dex.ag/wp-content/uploads/2023/07/Michael-Abetz-bw.jpg",
  },
];

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <Card className="bg-slate-900/60 border-slate-800 overflow-hidden group hover:border-slate-700 transition-colors">
      <CardContent className="p-0">
        <div className="aspect-square overflow-hidden bg-slate-800 relative">
          <img
            src={member.image}
            alt={member.name}
            className="w-full h-full object-cover object-top grayscale group-hover:grayscale-0 transition-all duration-500"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          <div className="hidden items-center justify-center w-full h-full absolute inset-0 bg-slate-800 text-slate-500">
            <Users className="h-12 w-12" />
          </div>
        </div>
        <div className="p-5">
          <h3 className="text-white font-bold text-base mb-0.5">{member.name}</h3>
          <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-3">{member.role}</p>
          <p className="text-slate-400 text-sm leading-relaxed line-clamp-4">{member.bio}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamSection({
  title,
  icon,
  members,
  columns = 3,
}: {
  title: string;
  icon: React.ReactNode;
  members: TeamMember[];
  columns?: number;
}) {
  const gridClass =
    columns === 5
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5"
      : columns === 4
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5";

  return (
    <section className="mb-16">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-slate-800 p-2 rounded-lg">{icon}</div>
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <div className="flex-1 h-px bg-slate-800 ml-3" />
      </div>
      <div className={gridClass}>
        {members.map((m) => (
          <TeamCard key={m.name} member={m} />
        ))}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="about" />

      <main className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-slate-800/60 border border-slate-700/40 text-slate-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
            <Users className="h-3.5 w-3.5" />
            Who We Are
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-5">
            About <span className="text-red-500">CryptoKiller</span>
          </h1>
          <p className="text-slate-400 max-w-3xl mx-auto leading-relaxed text-lg">
            CryptoKiller is powered by a diverse team of financial experts,
            crypto analysts, investigative journalists, and security researchers. We run
            sophisticated systems 24/7 to discover the latest crypto scams, track them,
            and publish detailed investigations to protect investors worldwide.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
          {[
            {
              icon: <Eye className="h-6 w-6" />,
              color: "text-red-400",
              bg: "bg-red-500/10 border-red-900/30",
              stat: "1,000+",
              label: "Scam Brands Tracked",
            },
            {
              icon: <BookOpen className="h-6 w-6" />,
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-900/30",
              stat: "248",
              label: "Published Investigations",
            },
            {
              icon: <Target className="h-6 w-6" />,
              color: "text-blue-400",
              bg: "bg-blue-500/10 border-blue-900/30",
              stat: "45+",
              label: "Countries Monitored",
            },
            {
              icon: <Shield className="h-6 w-6" />,
              color: "text-green-400",
              bg: "bg-green-500/10 border-green-900/30",
              stat: "24/7",
              label: "Scam Monitoring",
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`text-center p-6 rounded-xl border ${item.bg}`}
            >
              <div className={`${item.color} flex justify-center mb-3`}>
                {item.icon}
              </div>
              <p className="text-3xl font-black text-white mb-1">{item.stat}</p>
              <p className="text-slate-500 text-sm">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 md:p-10 mb-16">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-2xl font-black text-white mb-4">Our Mission</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                At CryptoKiller, we pride ourselves on having a diverse and talented team of
                professionals who are passionate about protecting people from crypto fraud.
                From skilled developers and crypto analysts to meticulous investigators and
                dedicated writers, our team is committed to delivering exceptional results.
              </p>
              <p className="text-slate-400 leading-relaxed">
                Together, we combine our expertise, innovation, and collaborative spirit to
                tackle the growing challenge of cryptocurrency scams, exceed expectations,
                and make a positive impact in the digital landscape.
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  icon: <Shield className="h-5 w-5 text-red-400" />,
                  title: "Always on Stand-by",
                  desc: "Our monitoring systems and team operate around the clock to detect new scam platforms as they emerge.",
                },
                {
                  icon: <TrendingUp className="h-5 w-5 text-amber-400" />,
                  title: "Massive Experience",
                  desc: "Combined decades of experience in finance, cryptocurrency, cybersecurity, and investigative journalism.",
                },
                {
                  icon: <Code className="h-5 w-5 text-blue-400" />,
                  title: "Speed of Service",
                  desc: "Our sophisticated detection systems enable rapid identification and analysis of fraudulent crypto advertising campaigns.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl"
                >
                  <div className="shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">
                      {item.title}
                    </p>
                    <p className="text-slate-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <TeamSection
          title="Managers & Technical Crew"
          icon={<Target className="h-5 w-5 text-red-400" />}
          members={leadership}
          columns={5}
        />

        <TeamSection
          title="Editorial Team"
          icon={<Newspaper className="h-5 w-5 text-amber-400" />}
          members={editorial}
          columns={5}
        />

        <TeamSection
          title="Analysts & Software Writers"
          icon={<Code className="h-5 w-5 text-blue-400" />}
          members={analysts}
          columns={5}
        />

        <TeamSection
          title="Crypto Writers"
          icon={<PenTool className="h-5 w-5 text-green-400" />}
          members={cryptoWriters}
          columns={3}
        />

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center mb-10">
          <MapPin className="h-6 w-6 text-red-400 mx-auto mb-3" />
          <h3 className="text-white font-bold text-lg mb-2">Headquarters</h3>
          <p className="text-slate-400 text-sm mb-1">DEX Algo Technologies Pte Ltd.</p>
          <p className="text-slate-500 text-sm">
            150 Beach Rd., Level 35 Gateway West, Singapore 189720
          </p>
          <a
            href="https://dex.ag/team/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm mt-4 underline underline-offset-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Visit DEX.ag
          </a>
        </div>

        <div className="border-t border-slate-800 pt-8 pb-4 text-center">
          <p className="text-slate-600 text-xs">
            CryptoKiller runs sophisticated detection systems 24/7 to discover the latest crypto scams.
            All investigation data is sourced from real-time ad monitoring and community reports.
          </p>
        </div>
      </main>
    </div>
  );
}
