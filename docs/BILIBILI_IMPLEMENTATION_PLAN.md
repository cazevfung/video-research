# Bilibili Implementation Plan (If You Decide to Proceed)

**⚠️ WARNING:** This plan is provided for completeness only. **We strongly recommend NOT proceeding** without:
1. ✅ Legal approval from a lawyer familiar with Chinese copyright law
2. ✅ Proven user demand (test with manual upload first)
3. ✅ Budget approval for $12k-32k upfront + $2k-8k/month ongoing
4. ✅ Engineering capacity (80-120 hours + 10-20 hours/month maintenance)

---

## Phase 0: Prerequisites (Before Any Code)

### Legal (CRITICAL - DO FIRST)
- [ ] Consult lawyer with China expertise ($2,000 - $10,000)
- [ ] Review Bilibili Terms of Service
- [ ] Assess copyright infringement risks
- [ ] Draft user terms of service with disclaimers
- [ ] Set up DMCA takedown process
- [ ] Get written legal opinion: GO / NO-GO

**If legal says NO-GO, STOP HERE.**

### Business Validation
- [ ] Survey users: Would they use Bilibili support?
- [ ] Ask: Would they pay extra for Bilibili ($1-2 per video)?
- [ ] Check: What % of requests are Bilibili vs YouTube?
- [ ] Research: Is same content available on YouTube?
- [ ] Calculate: ROI based on expected usage

**If demand is low (<10% of users), consider Alternative 3 (manual upload) instead.**

### Budget Approval
- [ ] Get approval for $12,000-32,000 upfront development cost
- [ ] Get approval for $2,000-8,000/month operational cost
- [ ] Set up cloud budget alerts ($100, $500, $1000 thresholds)
- [ ] Plan for cost overruns (add 30% buffer)

---

## Phase 1: Research & Prototyping (Week 1-2)

**Goal:** Validate technical feasibility with minimal investment

### Tasks
- [ ] Set up local development environment
- [ ] Test yt-dlp with Bilibili URLs (10+ videos)
  - Try different quality levels
  - Test with login/cookies if needed
  - Measure download times
- [ ] Test FFmpeg audio extraction
  - Experiment with different formats (MP3, WAV)
  - Test compression settings
  - Measure processing times
- [ ] Research Alibaba Paraformer API
  - Create test account
  - Test with sample audio files
  - Verify pricing model
  - Test accuracy with Chinese content
- [ ] Test Google Cloud Storage
  - Upload test audio files
  - Generate signed URLs
  - Test with Paraformer API
- [ ] Document findings and issues

### Deliverables
- Technical proof-of-concept (working locally)
- Cost estimates refined with real data
- Risk assessment updated
- GO/NO-GO recommendation

**Estimated Time:** 20-30 hours  
**Estimated Cost:** $2,000-4,500 (engineering time)

---

## Phase 2: MVP Development (Week 3-6)

**Goal:** Build minimum viable product with core functionality

### 2.1 Backend Service Development

#### A. Video Download Service
```typescript
// backend/src/services/bilibili-download.service.ts

- [ ] Implement video downloader using yt-dlp
- [ ] Add quality selection logic (prefer 720p for cost)
- [ ] Add timeout handling (5-min max)
- [ ] Add error handling (rate limiting, CAPTCHA, etc.)
- [ ] Add retry logic (3 attempts with exponential backoff)
- [ ] Add video validation (max duration, file size)
- [ ] Write unit tests (80% coverage minimum)
```

#### B. Audio Extraction Service
```typescript
// backend/src/services/audio-extraction.service.ts

- [ ] Implement FFmpeg wrapper
- [ ] Add format conversion (video → MP3/WAV)
- [ ] Add compression settings (128kbps for cost efficiency)
- [ ] Add error handling (codec errors, corrupted files)
- [ ] Add progress tracking
- [ ] Write unit tests
```

#### C. Storage Service
```typescript
// backend/src/services/bilibili-storage.service.ts

- [ ] Implement GCS upload
- [ ] Generate signed URLs (1-hour expiry)
- [ ] Add lifecycle policies (auto-delete after 2 hours)
- [ ] Add error handling (quota exceeded, network timeouts)
- [ ] Write unit tests
```

#### D. Transcription Service
```typescript
// backend/src/services/paraformer.service.ts

- [ ] Implement Paraformer API client
- [ ] Add authentication
- [ ] Add error handling (API errors, timeouts)
- [ ] Add retry logic
- [ ] Parse and validate transcript output
- [ ] Write unit tests
```

#### E. Orchestration Service
```typescript
// backend/src/services/bilibili-orchestrator.service.ts

- [ ] Chain all services together
- [ ] Add progress tracking (SSE updates)
- [ ] Add comprehensive error handling
- [ ] Add cleanup on success and failure
- [ ] Add timeout handling (10-min max)
- [ ] Write integration tests
```

### 2.2 API Endpoints

```typescript
// backend/src/routes/bilibili.routes.ts

- [ ] POST /api/bilibili/summarize
  - Validate Bilibili URL
  - Check user quota/credits
  - Create job
  - Return job_id
- [ ] GET /api/bilibili/status/:job_id (SSE)
  - Stream progress updates
  - Handle all status states
  - Error handling
```

### 2.3 Infrastructure Setup

#### Docker Configuration
```dockerfile
# backend/Dockerfile

- [ ] Add FFmpeg installation
- [ ] Add yt-dlp installation
- [ ] Add Python (for yt-dlp)
- [ ] Configure ephemeral storage (10GB)
- [ ] Test Docker build locally
```

#### Cloud Run Configuration
```yaml
# backend/cloudbuild.yaml

- [ ] Update memory to 2GB
- [ ] Update CPU to 2 vCPUs
- [ ] Update timeout to 900s (15 min)
- [ ] Add ephemeral storage config
- [ ] Update environment variables
```

#### Google Cloud Storage
```bash
- [ ] Create GCS bucket: bilibili-audio-temp
- [ ] Set lifecycle policy (delete after 2 hours)
- [ ] Configure CORS if needed
- [ ] Set up IAM permissions
```

### 2.4 Monitoring & Logging

```typescript
// backend/src/utils/bilibili-metrics.ts

- [ ] Add custom metrics:
  - Download success/failure rates
  - Average download time
  - Average conversion time
  - Storage usage
  - Paraformer API latency
  - Overall success rate
- [ ] Add detailed logging at each step
- [ ] Add error tracking (Sentry or similar)
```

### 2.5 Configuration

```yaml
# backend/config.yaml additions

bilibili:
  enabled: false  # Feature flag
  max_duration_minutes: 30  # Limit video length
  max_file_size_mb: 500  # Limit file size
  download_timeout_seconds: 300  # 5 minutes
  conversion_timeout_seconds: 120  # 2 minutes
  cleanup_interval_hours: 1
  rate_limit_per_user_per_day: 3  # Start conservative
  
paraformer:
  api_endpoint: https://dashscope.aliyuncs.com/api/v1/services/audio/asr
  timeout_ms: 300000  # 5 minutes
  max_retries: 2
```

```bash
# backend/.env additions

BILIBILI_ENABLED=false
PARAFORMER_API_KEY=your-key-here
GCS_BILIBILI_BUCKET=bilibili-audio-temp
BILIBILI_TEMP_PATH=/tmp/bilibili
```

### Deliverables
- Working backend service (MVP)
- Docker container with all dependencies
- Cloud Run deployment configuration
- Basic monitoring and logging
- Unit tests (80% coverage)
- Integration tests

**Estimated Time:** 60-80 hours  
**Estimated Cost:** $6,000-12,000 (engineering time)

---

## Phase 3: Testing & Hardening (Week 7-8)

### 3.1 Testing

#### Unit Tests
- [ ] Video download service (80%+ coverage)
- [ ] Audio extraction service (80%+ coverage)
- [ ] Storage service (80%+ coverage)
- [ ] Transcription service (80%+ coverage)
- [ ] Orchestrator service (80%+ coverage)

#### Integration Tests
- [ ] End-to-end workflow (Bilibili URL → Summary)
- [ ] Error handling (each failure scenario)
- [ ] Cleanup verification (no storage leaks)
- [ ] Concurrent requests (5-10 simultaneous)
- [ ] Long video handling (1+ hour)
- [ ] Short video handling (<5 min)

#### Load Tests
- [ ] Stress test with 10 concurrent users
- [ ] Verify resource usage (CPU, RAM, storage)
- [ ] Verify cost per video
- [ ] Test cleanup under load
- [ ] Test failure recovery

#### Edge Cases
- [ ] Video not available
- [ ] Video age-restricted
- [ ] Video region-locked
- [ ] Invalid URL format
- [ ] Network failures mid-download
- [ ] FFmpeg crashes
- [ ] Storage quota exceeded
- [ ] Paraformer API down

### 3.2 Security Hardening

- [ ] Input validation (URL sanitization)
- [ ] Rate limiting (per user, per IP)
- [ ] Cost limits (per user, per day)
- [ ] File type validation (prevent arbitrary file execution)
- [ ] Timeout enforcement (prevent runaway processes)
- [ ] Storage quotas (prevent disk full)
- [ ] API key rotation support

### 3.3 Error Handling

```typescript
// Implement comprehensive error messages

ERROR_CODES:
  BILIBILI_INVALID_URL
  BILIBILI_VIDEO_NOT_FOUND
  BILIBILI_VIDEO_TOO_LONG
  BILIBILI_DOWNLOAD_FAILED
  BILIBILI_CONVERSION_FAILED
  BILIBILI_UPLOAD_FAILED
  BILIBILI_TRANSCRIPTION_FAILED
  BILIBILI_STORAGE_FULL
  BILIBILI_RATE_LIMIT_EXCEEDED
```

### Deliverables
- Comprehensive test suite
- Security audit passed
- Error handling validated
- Load test results documented
- Edge cases handled

**Estimated Time:** 20-30 hours  
**Estimated Cost:** $2,000-4,500 (engineering time)

---

## Phase 4: Deployment & Launch (Week 9-10)

### 4.1 Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Legal approval obtained (critical!)
- [ ] Security audit passed
- [ ] Budget alerts configured
- [ ] Monitoring dashboards ready
- [ ] Documentation complete
- [ ] Rollback plan documented

### 4.2 Deployment Strategy

#### Option A: Gradual Rollout (Recommended)
```
Week 1: Internal testing (team only, 10 videos)
Week 2: Alpha (5 trusted users, 50 videos)
Week 3: Beta (50 users, 500 videos)
Week 4: 10% of users (monitor closely)
Week 5: 25% of users
Week 6: 50% of users
Week 7: 100% (if all metrics good)
```

#### Option B: Feature Flag
```typescript
// backend/src/config/feature-flags.ts

- [ ] Implement feature flag system
- [ ] Allow per-user enablement
- [ ] Allow quick disable if issues arise
```

### 4.3 Deployment Steps

1. **Deploy to Staging**
   ```bash
   - [ ] Build Docker image
   - [ ] Deploy to staging Cloud Run
   - [ ] Run smoke tests
   - [ ] Verify monitoring
   ```

2. **Deploy to Production**
   ```bash
   - [ ] Build production Docker image
   - [ ] Deploy to Cloud Run (with feature flag OFF)
   - [ ] Verify health checks
   - [ ] Enable feature flag for internal team
   - [ ] Monitor for 24 hours
   ```

3. **Gradual Rollout**
   ```bash
   - [ ] Enable for alpha users (5)
   - [ ] Monitor metrics for 48 hours
   - [ ] Enable for beta users (50)
   - [ ] Monitor metrics for 1 week
   - [ ] Gradually increase % of users
   ```

### 4.4 Post-Deployment Monitoring

**First Week (Critical):**
- [ ] Monitor every 4 hours
- [ ] Check error rates (target: <10%)
- [ ] Check cost per video (target: <$0.50)
- [ ] Check success rate (target: >90%)
- [ ] Check user feedback
- [ ] Fix critical bugs immediately

**First Month:**
- [ ] Daily monitoring
- [ ] Weekly cost review
- [ ] Weekly scraper maintenance
- [ ] Bi-weekly performance optimization
- [ ] Monthly user satisfaction survey

### 4.5 Success Metrics

**Technical Metrics:**
- Success rate > 85%
- Average processing time < 8 minutes
- Cost per video < $0.50 (30-min video)
- Error rate < 15%

**Business Metrics:**
- User adoption > 10% (of total users)
- User satisfaction > 4/5 stars
- Cost within budget
- No legal issues

**If metrics not met within 1 month, consider disabling feature.**

### Deliverables
- Production deployment complete
- Monitoring dashboards live
- Rollout plan executed
- Success metrics tracked
- Issues documented and fixed

**Estimated Time:** 20-30 hours  
**Estimated Cost:** $2,000-4,500 (engineering time)

---

## Phase 5: Maintenance & Optimization (Ongoing)

### Daily Tasks
- [ ] Check error logs (15 min)
- [ ] Monitor cost dashboard (5 min)
- [ ] Check scraper health (10 min)

### Weekly Tasks
- [ ] Update yt-dlp if Bilibili changes detected (30 min)
- [ ] Review and fix failed jobs (1-2 hours)
- [ ] Analyze cost trends (30 min)
- [ ] Check storage usage and cleanup (30 min)
- [ ] Review user feedback (30 min)
- [ ] Update documentation (30 min)

### Monthly Tasks
- [ ] Performance optimization (2-4 hours)
- [ ] Cost optimization review (2 hours)
- [ ] Security audit (2 hours)
- [ ] Update dependencies (2 hours)
- [ ] User satisfaction survey (1 hour)
- [ ] Metrics report to stakeholders (2 hours)

### Quarterly Tasks
- [ ] Legal compliance review (4 hours)
- [ ] Architecture review (4 hours)
- [ ] Cost-benefit analysis (2 hours)
- [ ] Consider sunsetting if ROI negative (ongoing)

**Estimated Effort:** 10-20 hours/week (~$1,500-3,000/month)

---

## Alternative: Subtitle Scraping Only (Recommended Compromise)

**If full video processing seems too risky/expensive, consider this lighter approach:**

### How It Works
1. Check if Bilibili video has CC/subtitles
2. Scrape subtitle file (XML/JSON, <100KB)
3. Parse and use as transcript
4. No video download needed

### Pros
- ✅ Much faster (10-30 seconds vs 4-11 minutes)
- ✅ Much cheaper (~$0.005 vs $0.13-$3)
- ✅ No video/audio processing needed
- ✅ Lower legal risk (just metadata)
- ✅ Easier to maintain

### Cons
- ❌ Only works for ~20-30% of videos
- ❌ Subtitle quality varies
- ❌ Still technically violates ToS (but lighter)

### Implementation Effort
- **Time:** 20-40 hours (3-5 weeks)
- **Cost:** $2,000-6,000 (dev) + $100-500/month (operational)

### Recommendation
✅ **Try this approach first** before full video scraping. Much lower risk and cost.

---

## Cost Summary

### One-Time Costs
| Item | Low Estimate | High Estimate |
|------|-------------|---------------|
| Legal review | $2,000 | $10,000 |
| Phase 1 (Research) | $2,000 | $4,500 |
| Phase 2 (Development) | $6,000 | $12,000 |
| Phase 3 (Testing) | $2,000 | $4,500 |
| Phase 4 (Deployment) | $2,000 | $4,500 |
| **TOTAL UPFRONT** | **$14,000** | **$35,500** |

### Ongoing Monthly Costs
| Item | Low Estimate | High Estimate |
|------|-------------|---------------|
| Infrastructure (Cloud Run, GCS) | $500 | $5,000 |
| Paraformer API | $100 | $2,000 |
| Maintenance (engineering) | $1,500 | $3,000 |
| Monitoring & tools | $50 | $200 |
| **TOTAL MONTHLY** | **$2,150** | **$10,200** |

### Total First Year Cost
- **Best Case:** $14,000 + ($2,150 × 12) = **$39,800**
- **Worst Case:** $35,500 + ($10,200 × 12) = **$157,900**
- **Realistic:** ~$60,000-100,000

---

## Timeline Summary

```
Week 1-2:   Phase 0 & 1 (Prerequisites + Research)
Week 3-6:   Phase 2 (MVP Development)
Week 7-8:   Phase 3 (Testing)
Week 9-10:  Phase 4 (Deployment)
Week 11+:   Phase 5 (Maintenance)

Total: 10-12 weeks to production
```

---

## Decision Checkpoints

### After Phase 1 (Research)
**STOP if:**
- Legal review says NO-GO
- Technical POC shows major blockers
- Cost estimates exceed budget
- User demand is low

### After Phase 3 (Testing)
**STOP if:**
- Success rate < 80%
- Cost per video > $1
- Security issues found
- Unable to meet performance targets

### After 1 Month in Production
**STOP if:**
- User adoption < 5%
- Success rate < 85%
- Cost exceeds budget by 50%+
- Legal issues arise
- Negative ROI

---

## Rollback Plan

**If something goes wrong, be prepared to:**

1. **Immediate Shutdown:**
   ```bash
   - [ ] Disable feature flag
   - [ ] Stop accepting new Bilibili requests
   - [ ] Let existing jobs complete
   - [ ] Notify affected users
   ```

2. **Clean Up Resources:**
   ```bash
   - [ ] Delete all temporary files
   - [ ] Remove GCS bucket
   - [ ] Disable Cloud Run scaling
   - [ ] Archive logs for analysis
   ```

3. **Post-Mortem:**
   ```bash
   - [ ] Analyze what went wrong
   - [ ] Document lessons learned
   - [ ] Decide: Fix and retry, or abandon?
   ```

4. **User Communication:**
   ```bash
   - [ ] Email users about service removal
   - [ ] Offer refunds if applicable
   - [ ] Suggest alternatives (manual upload)
   ```

---

## Final Recommendations

### If You Must Proceed:

1. **Start with Subtitle Scraping** (Alternative approach)
   - Much lower risk and cost
   - Test market demand
   - Pivot to full video if needed

2. **Get Legal Approval First**
   - Absolutely critical
   - Non-negotiable
   - If lawyer says no, DON'T DO IT

3. **Set Strict Limits**
   - Max 30-minute videos
   - 3 videos per user per month
   - Kill switch if costs exceed $500/month
   - Disable immediately if legal issues

4. **Monitor Closely**
   - Daily cost checks first month
   - Weekly scraper updates
   - Be ready to shut down quickly

### Better Alternatives:

1. ✅ **Official Bilibili Partnership**
   - Takes longer but legally safe
   - More reliable
   - Better long-term

2. ✅ **User-Provided Transcripts**
   - Zero legal risk
   - Zero infrastructure cost
   - Test demand before investing

3. ✅ **Focus on YouTube**
   - Already works great
   - Huge Chinese content library
   - No new development needed

---

## Conclusion

This implementation plan is **provided for completeness**, but we **strongly recommend**:

# ❌ DO NOT PROCEED with Bilibili video scraping

**Instead:**
1. ✅ Test demand with manual transcript upload (2 weeks, $2k)
2. ✅ If demand exists, pursue official partnership (3-6 months)
3. ✅ If that fails, consider subtitle scraping only (lighter approach)
4. ✅ Only do full video scraping as ABSOLUTE LAST RESORT with legal approval

**Questions?** Refer to:
- `BILIBILI_SCRAPER_FEASIBILITY_REPORT.md` (full analysis)
- `BILIBILI_EXECUTIVE_SUMMARY.md` (quick summary)
- `BILIBILI_ARCHITECTURE_COMPARISON.md` (visual comparison)

---

**Good luck with your decision!** 🙏

*Remember: Sometimes the best code is the code you don't write.*
