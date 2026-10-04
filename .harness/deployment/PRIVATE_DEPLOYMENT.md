# Private VPC & Air-Gapped Deployment Guide

DiagramHQ Enterprise can be deployed into private customer environments with zero outbound internet access.

## Architecture Overview

```
                      Customer VPC (e.g. 10.240.0.0/16)
 ┌────────────────────────────────────────────────────────────────────────┐
 │                                                                        │
 │  ┌─────────────────────────┐             ┌──────────────────────────┐  │
 │  │      Web Gateway        │             │      Backend API         │  │
 │  │    (Next.js App)        │────────────▶│       (NestJS)           │  │
 │  │      Port 3000          │             │       Port 4000          │  │
 │  └─────────────────────────┘             └────────────┬─────────────┘  │
 │                │                                      │                │
 │                ▼                                      ▼                │
 │  ┌─────────────────────────┐             ┌──────────────────────────┐  │
 │  │    Internal Registry    │             │   PostgreSQL Database    │  │
 │  │  (docker.internal)      │             │        Port 5432         │  │
 │  └─────────────────────────┘             └──────────────────────────┘  │
 │                                                       │                │
 │                                                       ▼                │
 │  ┌─────────────────────────┐             ┌──────────────────────────┐  │
 │  │    Local AI Engine      │             │   MinIO / Internal S3    │  │
 │  │ (vLLM / Ollama internal)│◀────────────│        Port 9000         │  │
 │  └─────────────────────────┘             └──────────────────────────┘  │
 │                                                                        │
 └────────────────────────────────────────────────────────────────────────┘
                       ▲
                       │ FIREWALL: DROP ALL EGRESS TO 0.0.0.0/0
                 [Air-Gap Barrier]
```

## Prerequisites
1. **Container Runtime**: Docker 24+ and Docker Compose v2, or Kubernetes 1.28+.
2. **Network**: Dedicated Customer VPC CIDR (e.g. `10.240.0.0/16`) with default egress route blocked (`0.0.0.0/0` dropped).
3. **Internal Registry**: Pre-loaded container images from our release tarball:
   - `diagramhq-web:1.0.0`
   - `diagramhq-api:1.0.0`
   - `postgres:16-alpine`
   - `minio/minio:latest`
4. **Offline License Key**: Signed offline entitlement file from DiagramHQ.

## Air-Gapped Configuration
In air-gapped environments, set the following environment variables:
```bash
NEXT_PUBLIC_AIR_GAPPED=true
OFFLINE_LICENSE_KEY=DHQ-ENTERPRISE-OFFLINE-AIRGAP-KEY-2026-SIGNED
LOCAL_AI_ENDPOINT=http://vllm.customer.internal:8000/v1
```

## Smoke Test Verification
Run the integrated smoke test suite to verify a clean environment deployment:
```bash
# Verify Web Gateway probe
curl -fsS http://localhost:3000/healthz

# Verify API Server probe
curl -fsS http://localhost:4000/api/health

# Verify zero egress attempt
iptables -L -n -v | grep "DROP"
```
When all 6 automated probes pass, the deployment is marked **CLEAN & OPERATIONAL**.
