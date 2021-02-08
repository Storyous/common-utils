import log from './models/log';
import { onMongoClientConnected } from "./mongoClient";
import getCollection from "./getCollection";
import set = Reflect.set;
import {Collection, FilterQuery} from "mongodb";

// multiple waiting tasks should be handled by last time, so no one starve

//  nice to have - we can increase accuracy by exact setTimeout scheduling

// return controller ?

export type TaskFunction = () => Promise<unknown>|void;
export type Interval = string; // todo add other options
export type TaskId = string;

type Task = { taskId: TaskId, task: TaskFunction, interval: Interval };

type RunLogEntry = {
    startedAt: Date,
    finishedAt?: Date,
    error?: string | null
};

class TaskDocument {

    public runImmediately: boolean = false;

    public runLog = <RunLogEntry[]>[];

    constructor(public _id: TaskId, public runSince: Date) {}
}

type EnforcedTask = {
    taskId: string,
    resolve: () => void,
    reject: (reason: Error) => void
};

const state = {

    tasks: new Map<string, Task>(),

    registrationPromises: <Array<Promise<unknown>>>[],

    nextTaskTimeoutId: <NodeJS.Timeout|null>null,

    get collection (): Collection<TaskDocument> {
        return getCollection<TaskDocument>('cronTasks');
    },

    noTaskWaitTime: 10 * 1000,

    enforcedTasks: <Array<EnforcedTask>>[],

};


function getNextRunDate (interval: Interval): Date {
    // todo
    return new Date();
}

export function runCronTask (taskId: string): Promise<void> {
    if (!state.tasks.has(taskId)) {
        throw new Error(`Cannot run unknown task ${taskId}`);
    }
    return new Promise((resolve, reject) => {
        state.enforcedTasks.push({ taskId, resolve, reject });
        if (state.nextTaskTimeoutId) { // speed up the run if there is a break
            clearTimeout(state.nextTaskTimeoutId);
            state.nextTaskTimeoutId = null;
            runATask();
        }
    });
}

function ensureIndex () {
    return state.collection.createIndex({
        _id: 1, runImmediately: 1, runSince: 1 // todo test the index usage
    })
}

function getLockDate () {
    return new Date(Date.now() + 5 * 60 * 1000);
}

let shouldRun = true;

async function findATaskToRun (enforcedTask: EnforcedTask|null = null): Promise<Task|null> {

    let filter: FilterQuery<TaskDocument>;

    if (enforcedTask) {
        filter = { _id: enforcedTask.taskId };

    } else {
        filter = {
            _id: { $in: Array.from(state.tasks.keys()) },
            $or: [
                { runSince: { $lte: new Date() } }, // todo use aggegation and '$$NOW' comparation?
                { runImmediately: true }
            ]
        }
    }

    const { value: document } = await state.collection.findOneAndUpdate(filter, <any>[{
        $set: {
            runSince: getLockDate(),
            runImmediately: false,
        },
        $push: {
            $position: 0,
            $slice: 5,
            $each: [
                { startedAt: '$$NOW', finishedAt: null, error: null }
            ]
        }
    }], {
        returnOriginal: false,
        sort: { 'runLog.0.finishedAt': 1 }, // prefer tasks which
        projection: { _id: true }
    });

    if (!document) {
        return null;
    }

    return state.tasks.get(document._id)!;
}

async function processTask(task: Task, enforcedTask: EnforcedTask|null) {
    let taskError: Error | null = null;
    try {
        await task.task();
    } catch (err) {
        taskError = err;
    }
    const nextRunDate = getNextRunDate(task.interval);

    await state.collection.updateOne({_id: task.taskId}, <any>[
        {
            $set: {
                runSince: nextRunDate,
                'runLog.0.finishedAt': '$$NOW',
                'runLog.0.error': taskError ? `${taskError}` : null
            },
        }
    ]);

    if (enforcedTask) {
        if (taskError) {
            enforcedTask.reject(taskError);
        } else {
            enforcedTask.resolve();
        }
    }
}

function runATask (): void {
    (async () => {

        const enforcedTask = state.enforcedTasks.shift() || null; // there can be no enforced task
        let task: Task|null = null;

        try {
            task = await findATaskToRun(enforcedTask);

            if (!task) {
                return; // the finally statement will be called anyway
            }

            await processTask(task, enforcedTask);

        } catch (err) {
            log.error(err);

        } finally {
            if (shouldRun) {
                // if there was no task, wait for standard time,
                // but try find another one when one has finished
                const nextTaskDelay = task ? 0 : state.noTaskWaitTime;
                state.nextTaskTimeoutId = setTimeout(() => {
                    state.nextTaskTimeoutId = null;
                    runATask();
                }, nextTaskDelay);
            }
        }
    })();
}


let activating = false; // todo revise the logic

async function ensureStarter(): Promise<void> {
    if (!shouldRun || activating) {
        return;
    }
    activating = true;
    // let all task to be registered (if called in synchronous code)
    await new Promise((resolve) => setImmediate(resolve));
    // wait for all task to be ready
    await Promise.all(state.registrationPromises);

    runATask();
}

export function ensureStopped () {
    shouldRun = false;
}

export async function cronTask (taskId: string, interval: string, task: TaskFunction): Promise<void> {

    const registrationPromise = (async () => {
        // todo upsert document
        registry.set(taskId, {
            taskId,
            task,
            interval
        });
    })();

    state.registrationPromises.push(registrationPromise);
    ensureStarter();

    await registrationPromise;
}

cronTasks('sodexo-pair', 'P1D', async () => {

});

/*

acceptable interval values:

PT5M
({ lastStart }) => lastStart.addMinutes(1)
({ lastEnd }) => lastEnd.addMinutes(5)
({ previous }) => previous.plus({ minutes: 5 })
() => new Date()

*/
