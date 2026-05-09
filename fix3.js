// Fix: remove localOpportunities, use apiData directly
const fs = require('fs');
let c = fs.readFileSync('src/components/views/opportunities-view.tsx', 'utf8');

// Remove localOpportunities state declaration
c = c.replace(
  "  const [localOpportunities, setLocalOpportunities] = useState<Opportunity[]>(\n    [],\n  );",
  ""
);

// Remove import of useEffect if it was added
c = c.replace(", useEffect", "");

// Remove the useEffect block that syncs
c = c.replace(
  /  \/\/ Initialize local state from API data \(once\)\n  useEffect\(\(\) => \{[\s\S]*?\n  \}, \[apiOpps, localOpportunities\.length\]\);\n\n/,
  ""
);

// Replace source from localOpportunities to apiOpps in filtered
c = c.replace(
  "    const source =\n      localOpportunities.length > 0 ? localOpportunities : apiOpps;",
  "    const source = apiOpps;"
);

// Simplify handleDragEnd to use refetch instead of optimistic update
c = c.replace(
  /\/\/ Optimistic update\n      setLocalOpportunities\(\(prev\) =>\n        prev\.map\(\(o\) => \(o\.id === oppId \? \{ \.\.\.o, status: newStatus \} : o\)\),\n      \);\n\n      \/\/ PATCH API\n      fetch\(\`\/api\/opportunities\/\$\{oppId\}\`[\s\S]*?catch \(\(\) => \{\n          \/\/ Rollback\n          setLocalOpportunities\(\(prev\) =>\n            prev\.map\(\(o\) =>\n              o\.id === oppId \? \{ \.\.\.o, status: opp\.status \} : o,\n            \),\n          \);\n          toast\.error\("Erreur lors du changement de statut"\);\n        \}\);/,
  `      // PATCH API
      fetch(\`/api/opportunities/\${oppId}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Update failed");
          return res.json();
        })
        .then(() => refetch())
        .catch(() => {
          toast.error(t.opportunities.statuses[opp.status as keyof typeof t.opportunities.statuses] || "Erreur");
        });`
);

fs.writeFileSync('src/components/views/opportunities-view.tsx', c);
console.log('DONE');
