const { searchThreadsLatest, searchTag, searchExplore } = await import("../src/lib/threads/fetcher");

for (const kw of ["website design", "logo design"]) {
  const latest = await searchThreadsLatest(kw);
  console.log(`search "${kw}": posts=${latest.posts?.length ?? "null"} blocked=${latest.blocked}`);
}
const tag = await searchTag("website design");
console.log(`tag "websitedesign": posts=${tag.posts?.length ?? "null"} blocked=${tag.blocked}`);
if (tag.posts?.length) {
  console.log("sample:", JSON.stringify(tag.posts.slice(0, 2)).slice(0, 600));
}
const ex = await searchExplore();
console.log(`explore: posts=${ex.posts?.length ?? "null"} blocked=${ex.blocked}`);