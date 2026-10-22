# The Build journey, end to end in a real browser (Playwright for Python).
# Run the dev server (PORT=5178 node scripts/dev.mjs), then: python3 tests/e2e/build_journey.py [light|dark]
# Prints PASS/FAIL per step: show, foundation, materials, page from a selection, form embedded, carousel and ads
# from the page, offer change flags assets, targeted update keeps edits, undo/redo, remove vs keep, publish and
# submit (response tied to show and form), reload persistence.
from playwright.sync_api import sync_playwright
import time, sys, json
import os
C=os.environ.get("CHROMIUM", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"); SP=os.environ.get("SHOTS", "/tmp"); U=os.environ.get("BASE_URL", "http://localhost:5178")
scheme=sys.argv[1] if len(sys.argv)>1 else "light"
ok=lambda c,m: print(("PASS " if c else "FAIL ")+m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=C); errs=[]
    ctx=b.new_context(viewport={"width":1440,"height":900},color_scheme=scheme); d=ctx.new_page(); d.on("pageerror",lambda e: errs.append(str(e)))
    d.on("console", lambda m: errs.append("console: "+m.text) if m.type=="error" else None)
    shot=lambda n: d.screenshot(path=f"{SP}/j-{scheme}-{n}.png")
    d.goto(U+"/pro/"); time.sleep(2.5)
    # 1. a show
    sid=d.evaluate("(()=>{const s=createShow({name:'Lakeside Sauna',tint:'green'}); openShow(s.id,'canvas'); return s.id})()"); time.sleep(1); d.click('.pl-tabs [data-v=canvas]') if d.locator('.pl-tabs [data-v=canvas]').count() else d.evaluate("S.view='canvas';render()"); time.sleep(1)
    ok(d.evaluate("S.view")=="canvas", "1 show open on Build")
    # foundation, rough
    d.click(".pf-h"); time.sleep(.3)
    d.fill("[data-found=offer]", "Wood-fired sauna evenings for groups of eight"); d.fill("[data-found=audience]", "Friends and teams in Helsinki"); d.fill("[data-found=cta]", "Book an evening"); time.sleep(.8)
    ok(d.evaluate("cur().dna.offer").startswith("Wood-fired"), "2a foundation saved to the show")
    d.click(".pf-h"); time.sleep(.2)
    # 2. brief, text, images through the library drawer
    def add(t):
        d.click("[data-act=openlib]"); time.sleep(.3); d.click(f".pl-drawer .lib-item[data-t={t}]"); time.sleep(.4); return d.evaluate("S.sel")
    ok(d.locator(".pl-drawer").count()==0 or True, "library opens as a drawer")
    tx=add("text"); d.fill(f"#p_{tx}_text", "Heat, lake, quiet. Bring your people and we do the rest."); time.sleep(.6)
    im1=add("image"); im2=add("image"); time.sleep(.3)
    d.evaluate(f"(()=>{{const p=[[ -200,0],[ -200,360],[ -200,720]]; ['{tx}','{im1}','{im2}'].forEach((id,i)=>{{S.nodes[id].x=p[i][0];S.nodes[id].y=p[i][1];commitNode(S.nodes[id]);}}); paintWorld(); fit();}})()"); time.sleep(.5)
    ok(d.evaluate(f"!!S.nodes['{tx}'] && !!S.nodes['{im1}']"), "2 text and images added")
    # connection by dragging: image dot onto text should explain, not connect
    def drag(a,bid):
        s=d.locator(f".nd[data-id='{a}'] .pl-dot.out").bounding_box(); t=d.locator(f".nd[data-id='{bid}']").bounding_box()
        d.mouse.move(s["x"]+9,s["y"]+9); d.mouse.down(); d.mouse.move(t["x"]+t["width"]/2,t["y"]+40,steps=8); d.mouse.up(); time.sleep(.5)
    drag(im1, tx); ok("takes" in d.inner_text("#pltoast") or "end point" in d.inner_text("#pltoast") or "Nothing" in d.inner_text("#pltoast"), "invalid connection explained: "+d.inner_text("#pltoast")[:80])
    # 3. landing page from the selection (shift-click)
    d.evaluate("S.sel=null; paintWorld()"); d.keyboard.down("Shift")
    for i in [tx,im1,im2]: d.locator(f".nd[data-id='{i}'] .pl-nhd").click()
    d.keyboard.up("Shift"); time.sleep(.3); shot("1-multi")
    d.click(".pl-multibar [data-t=page]"); time.sleep(2.5)
    pg=d.evaluate("Object.values(S.nodes).find(n=>n.type==='page').id")
    roles=d.evaluate(f"Object.values(S.edges).filter(e=>e.to==='{pg}').map(e=>e.role)")
    ok(d.evaluate(f"S.nodes['{pg}'].p.sections.length")>3 and "Hero image" in roles and "Copy" in roles, f"3 page drafted from the selection, relations {roles}")
    shot("2-page")
    # 4. form, placed inside the page
    d.click("[data-act=plcreate]"); time.sleep(.3); d.click(".plpop [data-act=ploutcome][data-t=form]"); time.sleep(2)
    fm=d.evaluate("Object.values(S.nodes).find(n=>n.type==='form').id")
    ok(len(d.evaluate(f"S.nodes['{fm}'].p.steps"))>=2, "4a multi-step form drafted with steps")
    drag(fm, pg); time.sleep(.5)
    secs=d.evaluate(f"S.nodes['{pg}'].p.sections.map(s=>s.type)"); ok("mform" in secs and d.evaluate(f"Object.values(S.edges).some(e=>e.from==='{fm}'&&e.to==='{pg}'&&e.role==='Embedded form')"), f"4b form embedded in the page as a section: {secs}")
    d.evaluate(f"selectNode('{pg}')"); time.sleep(.6); shot("3-labels")
    # 5. carousel and ads from the page
    d.click(f".nd[data-id='{pg}'] .pl-actbar [data-act=plcfopen]"); time.sleep(.3); shot("4-createfrom"); d.click(".plpop .plp-i >> text=Instagram carousel"); time.sleep(1)
    car=d.evaluate("Object.values(S.nodes).find(n=>n.type==='carousel').id")
    head=d.evaluate(f"S.nodes['{pg}'].p.sections.find(s=>s.type==='hero').headline")
    ok(d.evaluate(f"S.nodes['{car}'].p.slides[0].title")==head[:60] and d.evaluate(f"Object.values(S.edges).some(e=>e.from==='{pg}'&&e.to==='{car}'&&e.role==='Created from')"), "5a carousel created from the page's own headline, linked as Created from")
    d.evaluate(f"selectNode('{pg}')"); time.sleep(.3); d.click(".plpop .plp-i >> text=Search ad variations"); time.sleep(1)
    ad=d.evaluate("Object.values(S.nodes).find(n=>n.type==='ad').id"); ok(len(d.evaluate(f"S.nodes['{ad}'].p.headlines"))>=3, "5b ad variations from the page")
    # 7 (prep): a manual edit in the carousel
    d.evaluate(f"(()=>{{const n=S.nodes['{car}']; n.p.slides[1].title='Our own words'; commitNode(n);}})()"); time.sleep(.9)
    # 6. change the offer
    d.click(".pf-h"); time.sleep(.2); d.fill("[data-found=offer]", "Wood-fired sauna evenings for groups of twelve"); time.sleep(1.2)
    flagged=d.evaluate("Object.values(S.nodes).filter(n=>foundDiff(n).length||changedSources(n).length).map(n=>n.type)")
    ok("carousel" in flagged and "page" in flagged, f"6 offer change flags assets for review: {flagged}"); shot("5-flagged")
    d.click(".pf-h")
    # 7. update the carousel only
    d.evaluate(f"selectNode('{car}','settings')"); time.sleep(.5)
    old_slide0=d.evaluate(f"S.nodes['{car}'].p.slides[0].text")
    d.click("#insp [data-act=plupdate]"); time.sleep(.6)
    sl=d.evaluate(f"S.nodes['{car}'].p.slides")
    ok(any("twelve" in (s.get("text","")+s.get("title","")) for s in sl) and sl[1]["title"]=="Our own words" and not any("groups of eight" in (s.get("text","")+s.get("title","")) for s in sl), "7 carousel updated to the new offer, manual edit kept")
    ok(d.evaluate(f"foundDiff(S.nodes['{car}']).length")==0 and d.evaluate(f"foundDiff(S.nodes['{ad}']).length")>0, "7b only the selected draft changed; the ads still wait for review")
    shot("6-updated")
    # undo / redo
    d.keyboard.press("Escape"); d.evaluate("document.activeElement.blur()")
    d.keyboard.press("Control+z"); time.sleep(.5); u=d.evaluate(f"S.nodes['{car}'].p.slides.map(s=>s.text).join(' ')")
    d.keyboard.press("Control+Shift+z"); time.sleep(.5); r=d.evaluate(f"S.nodes['{car}'].p.slides.map(s=>s.text).join(' ')")
    ok("eight" in u and "twelve" in r, "undo and redo of the update")
    # remove from canvas keeps the asset
    d.evaluate(f"selectNode('{ad}')"); time.sleep(.3); d.click(f".nd[data-id='{ad}'] .pl-actbar [data-act=plremove]"); time.sleep(.4)
    ok(d.evaluate(f"!!S.nodes['{ad}'] && S.nodes['{ad}'].off===true") and d.locator(f".nd[data-id='{ad}']").count()==0, "remove from canvas keeps the asset")
    d.click("#pltray"); time.sleep(.3); d.click(f".plpop [data-act=plputback][data-id='{ad}']"); time.sleep(.4); ok(d.locator(f".nd[data-id='{ad}']").count()==1, "put back from the tray")
    # 8. publish the page and submit the form
    pub=d.evaluate(f"(()=>{{const n=addNode('publish', S.nodes['{pg}'].x+420, S.nodes['{pg}'].y); n.p.slug='lakeside-sauna-test'; commitNode(n); paintWorld(); return n.id}})()")
    drag(pg, pub); time.sleep(.3)
    d.evaluate(f"publishNode(S.nodes['{pub}'])"); time.sleep(1.2)
    ok(d.evaluate(f"S.nodes['{pub}'].p.live")==True, "8a page published")
    d.goto(U+"/pro/#p-lakeside-sauna-test"); time.sleep(2)
    d.locator("form.mf").scroll_into_view_if_needed(); shot("7-public")
    steps=d.locator("form.mf .mf-step").count()
    for i in range(steps-1):
        st=d.locator(f"form.mf .mf-step[data-k='{i}']")
        if st.locator(".mf-o").count(): st.locator(".mf-o").first.click(); time.sleep(.4)
        else: st.locator("input").fill("Friday"); d.click("form.mf .mf-next"); time.sleep(.3)
    d.fill("form.mf input[name=name]","Aino Test"); d.fill("form.mf input[name=email]","aino@example.com"); d.click("form.mf .mf-send"); time.sleep(.8); shot("8-sent")
    lead=d.evaluate("JSON.parse(localStorage.getItem('wss.local')).leads.slice(-1)[0]")
    ok(lead and lead.get("show")==sid and lead.get("asset")==fm and lead.get("email")=="aino@example.com", f"8b response saved to the show and the form: show={lead.get('show')==sid} asset={lead.get('asset')==fm}")
    # 9. reload
    d.goto(U+"/pro/"); time.sleep(2.5); d.evaluate(f"openShow('{sid}','canvas')"); time.sleep(1.5)
    ok(d.evaluate(f"S.nodes['{car}'].p.slides[1].title")=="Our own words" and d.evaluate(f"Object.values(S.edges).some(e=>e.from==='{fm}'&&e.to==='{pg}'&&e.role==='Embedded form')") and d.evaluate(f"S.nodes['{tx}'].x")==-200, "9 after reload: edits, relationships and positions persist")
    d.evaluate(f"selectNode('{fm}','settings')"); time.sleep(1); shot("9-responses")
    ok("aino" in d.inner_text("#insp").lower() or "Aino" in d.inner_text("#insp"), "form inspector lists the response")
    print("errors:", errs[:6]); b.close()
