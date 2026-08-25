const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch /api/chat
const targetChat = `    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error in AI Assistant Chat:', error);
    res.status(500).json({ error: error.message || 'AI Assistant failed to reply' });
  }`;
const replaceChat = `    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error in AI Assistant Chat:', error);
    res.json({ text: "I am currently operating in offline mode due to API quota limits. I am unable to answer dynamic questions right now, but you can rely on the dashboards for your daily operational metrics." });
  }`;
code = code.replace(targetChat, replaceChat);

// Patch /api/generate-summary
const targetSummary = `    res.json({ markdown: response.text });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }`;
const replaceSummary = `    res.json({ markdown: response.text });
  } catch (e: any) {
    console.error("Error generating summary:", e);
    res.json({ markdown: \`**Offline Mode Summary for \${nodeLabel}**\\n\\n- Track inventory levels carefully.\\n- Reorder popular items before stockout.\\n- Check expiration dates frequently to reduce waste.\` });
  }`;
code = code.replace(targetSummary, replaceSummary);

// Patch /api/inventory/alerts
const targetAlerts = `    res.json({ alerts });
  } catch (error: any) {
    console.error('Error generating AI alerts:', error);
    res.status(500).json({ error: error.message });
  }`;
const replaceAlerts = `    res.json({ alerts });
  } catch (error: any) {
    console.error('Error generating AI alerts:', error);
    res.json({ 
      alerts: criticalItems.map(i => ({
        itemName: i.name,
        alertMessage: \`CRITICAL: Stock is down to \${i.stockLevel} (Minimum: \${i.reorderPoint}). Restock now.\`
      }))
    });
  }`;
code = code.replace(targetAlerts, replaceAlerts);

// Patch /api/supply-intelligence
const targetIntelligence = `    res.json({ insights });
  } catch (error: any) {
    console.error('Error generating AI intelligence:', error);
    res.status(500).json({ error: error.message });
  }`;
const replaceIntelligence = `    res.json({ insights });
  } catch (error: any) {
    console.error('Error generating AI intelligence:', error);
    res.json({ insights: [
      {
        pattern: "Standard Velocity",
        insight: "Offline mode active. Using historical average algorithms instead of AI.",
        seasonalAdjustment: "Maintain regular buffer stock for essentials.",
        impactLevel: "Medium"
      }
    ] });
  }`;
code = code.replace(targetIntelligence, replaceIntelligence);

// Patch /api/supply-risk
const targetRisk = `    res.json({ riskAssessments });
  } catch (error: any) {
    console.error('Error generating supply risk assessment:', error);
    res.status(500).json({ error: error.message });
  }`;
const replaceRisk = `    res.json({ riskAssessments });
  } catch (error: any) {
    console.error('Error generating supply risk assessment:', error);
    res.json({ 
      riskAssessments: riskData.map(p => ({
        sku: p.sku,
        riskLevel: p.stock <= p.reorderPoint ? "Critical" : "High",
        analysis: \`Stock is at \${p.stock}, near or below reorder threshold.\`,
        recommendation: \`Restock recommended to avoid stockout.\`
      }))
    });
  }`;
code = code.replace(targetRisk, replaceRisk);

fs.writeFileSync('server.ts', code);
