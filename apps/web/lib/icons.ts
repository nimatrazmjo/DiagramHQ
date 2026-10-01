/**
 * Icon resolver utilities for DiagramHQ.
 * Maps technologies, database kinds, cloud platforms, and programming languages
 * to their corresponding local SVG assets in /icons.
 */

export interface IconMeta {
  id: string;
  name: string;
  category: 'databases' | 'languages' | 'clouds';
  path: string;
  keywords: string[];
}

export const ICONS_REGISTRY: Record<string, IconMeta> = {
  // Clouds & Platforms
  azure: {
    id: 'azure',
    name: 'Microsoft Azure',
    category: 'clouds',
    path: '/icons/clouds/azure.svg',
    keywords: ['azure', 'microsoft', 'cloud', 'entra', 'functions', 'blob'],
  },
  aws: {
    id: 'aws',
    name: 'Amazon Web Services',
    category: 'clouds',
    path: '/icons/clouds/aws.svg',
    keywords: ['aws', 'amazon', 'cloud', 's3', 'ec2', 'lambda'],
  },
  gcp: {
    id: 'gcp',
    name: 'Google Cloud Platform',
    category: 'clouds',
    path: '/icons/clouds/gcp.svg',
    keywords: ['gcp', 'google', 'cloud', 'bigquery', 'gke', 'cloudrun'],
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    category: 'clouds',
    path: '/icons/clouds/claude.svg',
    keywords: ['claude', 'anthropic', 'ai', 'llm'],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    category: 'clouds',
    path: '/icons/clouds/anthropic.svg',
    keywords: ['anthropic', 'claude', 'ai'],
  },
  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare',
    category: 'clouds',
    path: '/icons/clouds/cloudflare.svg',
    keywords: ['cloudflare', 'cdn', 'workers', 'dns'],
  },
  digitalocean: {
    id: 'digitalocean',
    name: 'DigitalOcean',
    category: 'clouds',
    path: '/icons/clouds/digitalocean.svg',
    keywords: ['digitalocean', 'droplet', 'cloud'],
  },
  docker: {
    id: 'docker',
    name: 'Docker',
    category: 'clouds',
    path: '/icons/clouds/docker.svg',
    keywords: ['docker', 'container', 'containers'],
  },
  kubernetes: {
    id: 'kubernetes',
    name: 'Kubernetes',
    category: 'clouds',
    path: '/icons/clouds/kubernetes.svg',
    keywords: ['kubernetes', 'k8s', 'cluster', 'orchestration'],
  },
  terraform: {
    id: 'terraform',
    name: 'Terraform',
    category: 'clouds',
    path: '/icons/clouds/terraform.svg',
    keywords: ['terraform', 'iac', 'hashicorp'],
  },

  // Databases & Storage
  postgresql: {
    id: 'postgresql',
    name: 'PostgreSQL',
    category: 'databases',
    path: '/icons/databases/postgresql.svg',
    keywords: ['postgresql', 'postgres', 'psql', 'rdbms', 'sql'],
  },
  mysql: {
    id: 'mysql',
    name: 'MySQL',
    category: 'databases',
    path: '/icons/databases/mysql.svg',
    keywords: ['mysql', 'mariadb', 'sql', 'rdbms'],
  },
  sqlite: {
    id: 'sqlite',
    name: 'SQLite',
    category: 'databases',
    path: '/icons/databases/sqlite.svg',
    keywords: ['sqlite', 'embedded', 'sql'],
  },
  mongodb: {
    id: 'mongodb',
    name: 'MongoDB',
    category: 'databases',
    path: '/icons/databases/mongodb.svg',
    keywords: ['mongodb', 'mongo', 'nosql', 'document'],
  },
  redis: {
    id: 'redis',
    name: 'Redis',
    category: 'databases',
    path: '/icons/databases/redis.svg',
    keywords: ['redis', 'cache', 'keyvalue', 'in-memory'],
  },
  mariadb: {
    id: 'mariadb',
    name: 'MariaDB',
    category: 'databases',
    path: '/icons/databases/mariadb.svg',
    keywords: ['mariadb', 'mysql', 'sql'],
  },
  oracle: {
    id: 'oracle',
    name: 'Oracle Database',
    category: 'databases',
    path: '/icons/databases/oracle.svg',
    keywords: ['oracle', 'rdbms', 'sql'],
  },
  mssql: {
    id: 'mssql',
    name: 'Microsoft SQL Server',
    category: 'databases',
    path: '/icons/databases/mssql.svg',
    keywords: ['mssql', 'sqlserver', 'azure-sql', 'microsoft-sql'],
  },
  dynamodb: {
    id: 'dynamodb',
    name: 'Amazon DynamoDB',
    category: 'databases',
    path: '/icons/databases/dynamodb.svg',
    keywords: ['dynamodb', 'aws-dynamodb', 'nosql'],
  },
  cassandra: {
    id: 'cassandra',
    name: 'Apache Cassandra',
    category: 'databases',
    path: '/icons/databases/cassandra.svg',
    keywords: ['cassandra', 'columnar', 'nosql'],
  },
  elasticsearch: {
    id: 'elasticsearch',
    name: 'Elasticsearch',
    category: 'databases',
    path: '/icons/databases/elasticsearch.svg',
    keywords: ['elasticsearch', 'elastic', 'search', 'opensearch'],
  },
  neo4j: {
    id: 'neo4j',
    name: 'Neo4j',
    category: 'databases',
    path: '/icons/databases/neo4j.svg',
    keywords: ['neo4j', 'graph', 'cypher'],
  },
  couchbase: {
    id: 'couchbase',
    name: 'Couchbase',
    category: 'databases',
    path: '/icons/databases/couchbase.svg',
    keywords: ['couchbase', 'nosql', 'document'],
  },
  clickhouse: {
    id: 'clickhouse',
    name: 'ClickHouse',
    category: 'databases',
    path: '/icons/databases/clickhouse.svg',
    keywords: ['clickhouse', 'olap', 'analytics'],
  },
  supabase: {
    id: 'supabase',
    name: 'Supabase',
    category: 'databases',
    path: '/icons/databases/supabase.svg',
    keywords: ['supabase', 'postgres', 'baas'],
  },
  firebase: {
    id: 'firebase',
    name: 'Firebase',
    category: 'databases',
    path: '/icons/databases/firebase.svg',
    keywords: ['firebase', 'firestore', 'realtime-database', 'google'],
  },
  kafka: {
    id: 'kafka',
    name: 'Apache Kafka',
    category: 'databases',
    path: '/icons/databases/kafka.svg',
    keywords: ['kafka', 'event-stream', 'queue', 'pubsub'],
  },
  rabbitmq: {
    id: 'rabbitmq',
    name: 'RabbitMQ',
    category: 'databases',
    path: '/icons/databases/rabbitmq.svg',
    keywords: ['rabbitmq', 'amqp', 'queue', 'message-broker'],
  },

  // Programming Languages
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    category: 'languages',
    path: '/icons/languages/typescript.svg',
    keywords: ['typescript', 'ts'],
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    category: 'languages',
    path: '/icons/languages/javascript.svg',
    keywords: ['javascript', 'js', 'node', 'nodejs'],
  },
  python: {
    id: 'python',
    name: 'Python',
    category: 'languages',
    path: '/icons/languages/python.svg',
    keywords: ['python', 'py'],
  },
  go: {
    id: 'go',
    name: 'Go',
    category: 'languages',
    path: '/icons/languages/go.svg',
    keywords: ['go', 'golang'],
  },
  rust: {
    id: 'rust',
    name: 'Rust',
    category: 'languages',
    path: '/icons/languages/rust.svg',
    keywords: ['rust', 'rs'],
  },
  java: {
    id: 'java',
    name: 'Java',
    category: 'languages',
    path: '/icons/languages/java.svg',
    keywords: ['java', 'jvm'],
  },
  c: {
    id: 'c',
    name: 'C',
    category: 'languages',
    path: '/icons/languages/c.svg',
    keywords: ['c'],
  },
  cplusplus: {
    id: 'cplusplus',
    name: 'C++',
    category: 'languages',
    path: '/icons/languages/cplusplus.svg',
    keywords: ['cplusplus', 'cpp', 'c++'],
  },
  csharp: {
    id: 'csharp',
    name: 'C#',
    category: 'languages',
    path: '/icons/languages/csharp.svg',
    keywords: ['csharp', 'c#', 'dotnet', '.net'],
  },
  php: {
    id: 'php',
    name: 'PHP',
    category: 'languages',
    path: '/icons/languages/php.svg',
    keywords: ['php'],
  },
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    category: 'languages',
    path: '/icons/languages/ruby.svg',
    keywords: ['ruby', 'rails'],
  },
  swift: {
    id: 'swift',
    name: 'Swift',
    category: 'languages',
    path: '/icons/languages/swift.svg',
    keywords: ['swift', 'ios', 'macos'],
  },
  kotlin: {
    id: 'kotlin',
    name: 'Kotlin',
    category: 'languages',
    path: '/icons/languages/kotlin.svg',
    keywords: ['kotlin', 'android'],
  },
  scala: {
    id: 'scala',
    name: 'Scala',
    category: 'languages',
    path: '/icons/languages/scala.svg',
    keywords: ['scala'],
  },
  dart: {
    id: 'dart',
    name: 'Dart',
    category: 'languages',
    path: '/icons/languages/dart.svg',
    keywords: ['dart', 'flutter'],
  },
  html5: {
    id: 'html5',
    name: 'HTML5',
    category: 'languages',
    path: '/icons/languages/html5.svg',
    keywords: ['html', 'html5'],
  },
  css3: {
    id: 'css3',
    name: 'CSS3',
    category: 'languages',
    path: '/icons/languages/css3.svg',
    keywords: ['css', 'css3'],
  },
};

/**
 * Resolves a local SVG icon path by technology or platform name.
 * Searches ID matches, sanitized name matches, and aliases/keywords.
 */
export function getTechnologyIconPath(nameOrKind?: string | null): string | null {
  if (!nameOrKind) return null;
  const normalized = nameOrKind.trim().toLowerCase().replace(/[^a-z0-9#+]/g, '');

  // Exact ID check
  if (ICONS_REGISTRY[normalized]) {
    return ICONS_REGISTRY[normalized].path;
  }

  // Keyword / alias search
  for (const icon of Object.values(ICONS_REGISTRY)) {
    if (
      icon.id === normalized ||
      icon.keywords.some((kw) => kw.replace(/[^a-z0-9#+]/g, '') === normalized)
    ) {
      return icon.path;
    }
  }

  return null;
}
