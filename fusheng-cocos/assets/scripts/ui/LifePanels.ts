import type { Sim } from '../core/Sim';
import type { SimPanel } from '../core/Types';
import type { CourseActivity, CourseMetric, CourseYear } from '../core/LifeCourse';
import { artName, NEIGHBORS, styleName } from '../core/WeekLife';
import { weekText } from '../core/WeekText';
import type { PanelPresentation, WeekButton, WeekPanelHost } from './WeekPanels';

const text = (key: string, params: Record<string, string | number | undefined> = {}) => weekText(`life.ui.${key}`, params);
const METRICS: CourseMetric[] = ['learning', 'craft', 'bonds', 'vocation'];

export function renderLifePanel(sim: Sim, panel: SimPanel, host: WeekPanelHost): boolean {
    if (!['LifeCourse', 'LifeChoice', 'LifeEnding'].includes(panel.kind)) return false;
    const s = sim.state, l = s.life!, course = sim.course, c = course.data, stage = course.stage;
    const button = (key: string, run: () => void, primary = false): WeekButton => ({ key, run, primary });
    const show = (title: string, body: string, actions: WeekButton[], presentation: PanelPresentation = { mode: 'reading' }) => host.show(panel.kind, title, body, actions, undefined, presentation);
    const metricText = () => METRICS.map(key => text('course.metricLine', { name: course.text(`metrics.${key}`), value: c.metrics[key] })).join('\n');
    const direction = () => course.text(`course.direction.${c.direction}`);
    const showTimeline = (onBack: () => void) => {
        const showYears = (stageId: string) => {
            const chapter = course.content.stages.find(item => item.id === stageId)!;
            const years = c.years.filter(y => y.stageId === stageId);
            const showYear = (year: CourseYear) => show(text('recap.title', { age: year.age }), course.yearText(year), [button(text('course.backChapter'), () => showYears(stageId)), button(text('course.backAlbum'), () => showTimeline(onBack))]);
            show(chapter.name, chapter.goal, [...years.map(year => button(text('course.yearEntry', { age: year.age, works: year.works }), () => showYear(year))), button(text('course.backAlbum'), () => showTimeline(onBack))]);
        };
        show(text('course.yearTitle'), c.years.length ? text('course.albumIntro', { count: c.years.length }) : text('course.noYears'), [...course.content.stages.filter(chapter => c.years.some(y => y.stageId === chapter.id)).map(chapter => button(chapter.name, () => showYears(chapter.id))), button(text(panel.kind === 'LifeEnding' ? 'ending.back' : 'course.backGrowth'), onBack)]);
    };
    const showChoices = (onBack: () => void) => {
        const chosen = course.content.milestones.map(m => ({ milestone: m, choice: m.choices.find(option => option.id === c.choices[String(m.age)]) })).filter(entry => entry.choice);
        const showChoice = (entry: typeof chosen[number]) => show(entry.milestone.title, text('course.choiceHistoryBody', { age: entry.milestone.age, label: entry.choice!.label, result: entry.choice!.result, hint: entry.choice!.hint }), [button(text('course.backChoices'), () => showChoices(onBack))]);
        show(text('course.choiceTitle'), chosen.length ? text('course.choicesIntro') : text('course.noChoices'), [...chosen.map(entry => button(text('course.choiceEntry', { age: entry.milestone.age, title: entry.milestone.title }), () => showChoice(entry))), button(text(panel.kind === 'LifeEnding' ? 'ending.back' : 'course.backGrowth'), onBack)]);
    };

    if (panel.kind === 'LifeChoice') {
        const milestone = course.milestone;
        if (!milestone) { host.send({ type: 'Course', action: 'open' }); return true; }
        const overview = () => show(milestone.title, text('choice.overview', { stage: stage.name, body: milestone.body, entry: s.age === stage.minAge ? text('choice.entry', { intro: stage.intro, home: stage.home }) : '' }), milestone.choices.map(choice => button(choice.label, () => show(choice.label, text('choice.optionBody', { hint: choice.hint, result: choice.result }), [button(text('choice.confirm'), () => host.send({ type: 'Course', action: 'choose', id: choice.id }), true), button(text('choice.back'), overview)]))));
        overview();
        return true;
    }
    if (panel.kind === 'LifeCourse') {
        const view = () => host.send({ type: 'Course', action: 'open' });
        const showGrowth = () => show(text('course.growth'), text('course.metrics', { metrics: metricText(), direction: direction() }), [button(text('course.years'), () => showTimeline(showGrowth)), button(text('course.choices'), () => showChoices(showGrowth)), button(text('course.back'), view)]);
        const showActivity = (activity: CourseActivity) => {
            const done = course.activityDone(activity.id), insufficient = l.focus < activity.focus, tooLate = s.clock + activity.minutes >= sim.content.rules.endClock;
            const bonus = (c.direction === 'study' && activity.metric === 'learning') || (c.direction === 'care' && activity.metric === 'bonds') ? 1 : 0;
            const reward = activity.money ? activity.money + (c.direction === 'work' ? 10 : 0) : 0;
            const status = done ? text('course.finishedToday') : insufficient ? text('course.noFocus') : tooLate ? text('course.tooLate') : text('course.canDo');
            show(activity.label, text('course.activityBody', { desc: activity.desc, focus: activity.focus, minutes: activity.minutes, metric: course.text(`metrics.${activity.metric}`), amount: activity.amount + bonus, income: reward ? text('course.income', { money: reward }) : '', status }), [
                ...(!done && !insufficient && !tooLate ? [button(text('course.startActivity'), () => host.send({ type: 'Course', action: 'activity', id: activity.id }), true)] : []),
                button(text('course.back'), view), button(text('backJournal'), () => host.send({ type: 'Life', action: 'journal' })),
            ], { mode: 'reading', sections: [
                { title: text('course.sectionDescription'), body: activity.desc },
                { title: text('course.sectionCost'), body: text('course.activityCost', { focus: activity.focus, minutes: activity.minutes }) },
                { title: text('course.sectionReward'), body: text('course.activityReward', { metric: course.text(`metrics.${activity.metric}`), amount: activity.amount + bonus, income: reward ? text('course.income', { money: reward }) : '' }) },
                { title: text('course.sectionAvailability'), body: status },
            ] });
        };
        show(text('course.title', { age: s.age }), text('course.overview', { stage: stage.name, goal: stage.yearGoal, focus: l.focus, day: text(`day.${s.day}`), home: stage.home }), [
            ...course.activities.map(activity => button(text('course.activity', { name: activity.label, done: course.activityDone(activity.id) ? text('course.done') : '' }), () => showActivity(activity))),
            button(text('course.growth'), showGrowth), button(text('backJournal'), () => host.send({ type: 'Life', action: 'journal' })),
        ], { mode: 'journal', sections: [
            { title: text('course.sectionYear'), body: [stage.name, stage.yearGoal].join('\n') },
            { title: text('course.sectionToday'), body: text('course.todayBody', { focus: l.focus, day: text(`day.${s.day}`), home: stage.home }) },
            { title: text('course.sectionActivities'), body: text('course.activitiesHint') },
        ] });
        return true;
    }
    const ending = () => {
        const summary = text('ending.summary', { metrics: course.text('course.stats', c.metrics), direction: direction(), works: s.stats.paintings, years: c.years.length });
        show(text('ending.title'), text('ending.overview', { start: c.startedAge, summary }), [button(text('ending.album'), () => showTimeline(ending), true), button(text('course.choices'), () => showChoices(ending)), button(text('ending.works'), showWorks), button(text('ending.people'), showPeople), ...(host.finish ? [button(text('ending.titleBack'), host.finish)] : [])]);
    };
    const showPeople = () => show(text('ending.people'), text('ending.peopleBody', { people: NEIGHBORS.map(n => text('ending.person', { name: n.name, trust: l.neighbors[n.id].trust, memory: l.neighbors[n.id].memories.slice(-1).join('') || text('journal.noMemory') })).join('\n\n') }), [button(text('ending.back'), ending)]);
    const showWorks = () => {
        const works = l.works.slice().sort((a, b) => b.quality - a.quality).slice(0, 6);
        const showWork = (work: typeof works[number]) => host.show(panel.kind, text('artTitle', { name: artName(work) }), text('ending.workLine', { age: Math.max(c.startedAge, s.age - (s.week - work.week)), style: styleName(work.style), name: artName(work), quality: work.quality, state: text(`artState.${work.status}`, { slot: (work.slot ?? 0) + 1, person: NEIGHBORS.find(n => n.id === work.recipient)?.name ?? work.recipient ?? '' }) }), [button(text('ending.backWorks'), showWorks), button(text('ending.back'), ending)], work);
        show(text('ending.works'), text('ending.worksBody', { count: s.stats.paintings, works: works.length ? text('ending.worksIntro') : text('ending.noWorks') }), [...works.map(work => button(text('collection.workRow', { name: artName(work), style: styleName(work.style), state: text('ending.workQuality', { quality: work.quality }) }), () => showWork(work))), button(text('ending.back'), ending)]);
    };
    ending();
    return true;
}
