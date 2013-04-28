import numpy as np
import Image

import pracweb.registry as reg


def process_problem(problem):
    n_classes, classifiers, corrector = solve(problem)

    Xgrid = make_grid(problem.grid)

    Kprobs = apply_classifiers(classifiers, Xgrid, n_classes)
    Fprobs = corrector(Kprobs)

    cmap = prepare_cmap(problem)

    return {
        'argmax': visual_argmax(Fprobs, cmap, problem),
    }


def solve(problem):
    n_classes = len(problem.data.class_names)
    classifiers = [reg.classifiers[c](problem.data.learn[0],
                                      problem.data.learn[1])
                   for c in problem.model.classifiers]
    corrector = reg.correctors[problem.model.corrector](
        apply_classifiers(classifiers, problem.data.learn[0], n_classes),
        problem.data.learn[1],
        n_classes)
    return n_classes, classifiers, corrector


def make_grid(grid):
    xx = np.linspace(grid.left,
                     grid.right,
                     grid.width)
    yy = np.linspace(grid.top,
                     grid.bottom,
                     grid.height).T
    xx, yy = np.meshgrid(xx, yy)
    return np.c_[xx.ravel(), yy.ravel()]


def apply_classifiers(classifiers, x, n_classes):
    Kprobs = np.empty((x.shape[0], n_classes, len(classifiers)))
    for i in xrange(0, len(classifiers)):
        Kprobs[:, :, i] = classifiers[i](x)
    return Kprobs


def prepare_cmap(problem):
    n_classes = len(problem.data.class_names)
    cmap = np.empty((n_classes, 3))
    for c in xrange(0, n_classes):
        cmap[c, :] = problem.colormap[problem.data.class_names[c]]
    return cmap


def visual_argmax(Fprobs, cmap, problem):
    Cpred = Fprobs.argmax(1)

    viz = np.empty((Cpred.size, 3))
    for x in xrange(0, Cpred.size):
        viz[x, :] = cmap[Cpred[x], :]
    viz = viz.reshape((problem.grid.height, problem.grid.width, 3))
    viz = np.array(viz, dtype=np.uint8)
    return Image.fromarray(viz)