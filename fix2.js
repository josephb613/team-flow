const fs = require('fs');
let c = fs.readFileSync('src/components/views/opportunities-view.tsx', 'utf8');

// Replace useMemo with useEffect
c = c.replace(
  /useMemo\(\(\) => \{[\r\n]+\s+if \(apiOpps.length > 0 && localOpportunities.length === 0\) \{[\r\n]+\s+setLocalOpportunities\(apiOpps\);[\r\n]+\s+\}[\r\n]+\s+[\r\n]+\s+\}, \[apiOpps\]\);/,
  "useEffect(() => {\n    if (apiOpps.length > 0 && localOpportunities.length === 0) {\n      setLocalOpportunities(apiOpps);\n    }\n  }, [apiOpps, localOpportunities.length]);"
);

var idx = c.indexOf('Initialize local');
console.log('After fix:');
console.log(c.substring(idx, idx + 300));

fs.writeFileSync('src/components/views/opportunities-view.tsx', c);
console.log('DONE');
